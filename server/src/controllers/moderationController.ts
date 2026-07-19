import crypto from 'crypto';
import {
  ContentReportStatus,
  ModerationAction,
  Prisma,
  ProfilePhotoModerationStatus,
  ReportContentType,
  ReportReason,
  TechnicianModerationStatus,
  UserModerationStatus,
} from '@prisma/client';
import { Request, Response } from 'express';
import prisma from '../prisma';
import { sendModerationReportAlert } from '../services/emailService';
import {
  CURRENT_UGC_TERMS_VERSION,
  hasInlineCurrentTermsConsent,
  moderationAge,
  recordCurrentTermsConsent,
} from '../services/moderationService';

const REPORT_CONTENT_TYPES = new Set(Object.values(ReportContentType));
const REPORT_REASONS = new Set(Object.values(ReportReason));
const FINAL_REPORT_STATUSES = new Set<ContentReportStatus>([
  ContentReportStatus.RESOLVED,
  ContentReportStatus.DISMISSED,
]);
const REPORT_ACTIONS = new Set(Object.values(ModerationAction));
const ACTIVE_REPORT_STATUSES: ContentReportStatus[] = [
  ContentReportStatus.OPEN,
  ContentReportStatus.UNDER_REVIEW,
];

function requestMetadata(req: Request) {
  return {
    ipAddress: req.ip || req.headers['x-forwarded-for']?.toString() || null,
    userAgent: req.headers['user-agent'] || null,
  };
}

function sha256(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function parseQueueLimit(value: unknown) {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return 25;
  return Math.min(50, Math.max(1, Number(value)));
}

function cleanOptionalText(value: unknown, maximum: number): string | null | undefined {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') return undefined;
  const cleaned = value.trim();
  if (!cleaned || cleaned.length > maximum) return undefined;
  return cleaned;
}

export async function getConsent(req: Request, res: Response) {
  try {
    const consent = await prisma.ugcTermsConsent.findUnique({
      where: {
        userId_termsVersion: {
          userId: req.auth!.userId,
          termsVersion: CURRENT_UGC_TERMS_VERSION,
        },
      },
      select: { termsVersion: true, acceptedAt: true },
    });

    res.json({
      requiredVersion: CURRENT_UGC_TERMS_VERSION,
      accepted: Boolean(consent),
      ...(consent && {
        acceptedVersion: consent.termsVersion,
        acceptedAt: consent.acceptedAt,
      }),
    });
  } catch (error) {
    console.error('Error reading UGC consent:', error);
    res.status(500).json({ message: 'No se pudo consultar la aceptación de las reglas' });
  }
}

export async function acceptConsent(req: Request, res: Response) {
  if (!hasInlineCurrentTermsConsent(req.body)) {
    return res.status(400).json({
      code: 'INVALID_UGC_TERMS_VERSION',
      message: 'Debes aceptar la versión vigente de las reglas de la comunidad',
      requiredVersion: CURRENT_UGC_TERMS_VERSION,
    });
  }

  try {
    const consent = await recordCurrentTermsConsent({
      userId: req.auth!.userId,
      ...requestMetadata(req),
    });
    res.json({
      requiredVersion: CURRENT_UGC_TERMS_VERSION,
      accepted: true,
      acceptedVersion: consent.termsVersion,
      acceptedAt: consent.acceptedAt,
    });
  } catch (error) {
    console.error('Error saving UGC consent:', error);
    res.status(500).json({ message: 'No se pudo guardar la aceptación de las reglas' });
  }
}

export async function createReport(req: Request, res: Response) {
  const { targetUserId, technicianId, contentType, reason } = req.body || {};
  const details = cleanOptionalText(req.body?.details, 500);

  if (typeof targetUserId !== 'string' || !targetUserId.trim() || targetUserId.length > 100) {
    return res.status(400).json({ message: 'La persona reportada no es válida' });
  }
  if (targetUserId === req.auth!.userId) {
    return res.status(400).json({ message: 'No puedes reportarte a ti mismo' });
  }
  if (technicianId !== undefined && (
    typeof technicianId !== 'string' || !technicianId.trim() || technicianId.length > 100
  )) {
    return res.status(400).json({ message: 'El perfil técnico reportado no es válido' });
  }
  if (!REPORT_CONTENT_TYPES.has(contentType)) {
    return res.status(400).json({ message: 'El tipo de contenido reportado no es válido' });
  }
  if (!REPORT_REASONS.has(reason)) {
    return res.status(400).json({ message: 'El motivo del reporte no es válido' });
  }
  if (details === undefined || (reason === ReportReason.OTHER && !details)) {
    return res.status(400).json({ message: 'Describe brevemente el motivo del reporte' });
  }

  const normalizedTargetUserId = targetUserId.trim();
  const normalizedTechnicianId = typeof technicianId === 'string' ? technicianId.trim() : null;
  const dedupeKey = `${req.auth!.userId}:${normalizedTargetUserId}:${contentType}`;

  try {
    const report = await prisma.$transaction(async (tx) => {
      const targetUser = await tx.user.findUnique({
        where: { id: normalizedTargetUserId },
        select: { id: true, photoUrl: true, deletedAt: true, technician: { select: { id: true } } },
      });
      if (!targetUser || targetUser.deletedAt) {
        throw new ModerationRequestError(404, 'Usuario reportado no encontrado');
      }

      if (normalizedTechnicianId && targetUser.technician?.id !== normalizedTechnicianId) {
        throw new ModerationRequestError(400, 'El perfil técnico no pertenece al usuario reportado');
      }
      if (contentType === ReportContentType.PROFILE && !targetUser.technician) {
        throw new ModerationRequestError(400, 'Este usuario no tiene un perfil técnico público');
      }
      if (contentType === ReportContentType.PHOTO && !targetUser.photoUrl) {
        throw new ModerationRequestError(400, 'Este usuario no tiene una foto pública para reportar');
      }

      const approvedPhoto = contentType === ReportContentType.PHOTO
        ? await tx.profilePhotoSubmission.findFirst({
            where: { userId: targetUser.id, status: ProfilePhotoModerationStatus.APPROVED },
            orderBy: { reviewedAt: 'desc' },
            select: { id: true },
          })
        : null;

      return tx.contentReport.create({
        data: {
          reporterId: req.auth!.userId,
          targetUserId: targetUser.id,
          technicianId: normalizedTechnicianId || targetUser.technician?.id || null,
          profilePhotoSubmissionId: approvedPhoto?.id || null,
          contentType,
          reason,
          details,
          contentFingerprint: contentType === ReportContentType.PHOTO && targetUser.photoUrl
            ? sha256(targetUser.photoUrl)
            : null,
          dedupeKey,
        },
        include: {
          targetUser: { select: { id: true, name: true } },
          technician: { select: { id: true } },
        },
      });
    });

    // Alerting is best effort. The report is already durable in the queue and a
    // mail outage must never prevent a user from reporting safety concerns.
    void sendModerationReportAlert({
      reportId: report.id,
      contentType: report.contentType,
      reason: report.reason,
      createdAt: report.createdAt,
    }).catch((error) => console.error('Moderation report alert failed:', error));

    res.status(201).json(report);
  } catch (error) {
    if (error instanceof ModerationRequestError) {
      return res.status(error.status).json({ message: error.message });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(409).json({ message: 'Ya existe un reporte abierto sobre este contenido' });
    }
    console.error('Error creating moderation report:', error);
    res.status(500).json({ message: 'No se pudo enviar el reporte' });
  }
}

export async function listOwnReports(req: Request, res: Response) {
  try {
    const reports = await prisma.contentReport.findMany({
      where: { reporterId: req.auth!.userId },
      select: {
        id: true,
        targetUserId: true,
        technicianId: true,
        contentType: true,
        reason: true,
        details: true,
        status: true,
        action: true,
        reviewedAt: true,
        createdAt: true,
        updatedAt: true,
        targetUser: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json(reports);
  } catch (error) {
    console.error('Error listing moderation reports:', error);
    res.status(500).json({ message: 'No se pudieron cargar tus reportes' });
  }
}

export async function listBlocks(req: Request, res: Response) {
  try {
    const blocks = await prisma.userBlock.findMany({
      where: { blockerId: req.auth!.userId },
      select: {
        id: true,
        blockedUserId: true,
        createdAt: true,
        blockedUser: { select: { id: true, name: true, photoUrl: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json(blocks);
  } catch (error) {
    console.error('Error listing blocks:', error);
    res.status(500).json({ message: 'No se pudo cargar la lista de bloqueos' });
  }
}

export async function createBlock(req: Request, res: Response) {
  const blockedUserId = req.params.userId;
  if (!blockedUserId || blockedUserId.length > 100) {
    return res.status(400).json({ message: 'El usuario que deseas bloquear no es válido' });
  }
  if (blockedUserId === req.auth!.userId) {
    return res.status(400).json({ message: 'No puedes bloquearte a ti mismo' });
  }

  try {
    const blockedUser = await prisma.user.findUnique({
      where: { id: blockedUserId },
      select: { id: true, deletedAt: true },
    });
    if (!blockedUser || blockedUser.deletedAt) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const block = await prisma.userBlock.create({
      data: { blockerId: req.auth!.userId, blockedUserId },
      select: {
        id: true,
        blockedUserId: true,
        createdAt: true,
        blockedUser: { select: { id: true, name: true, photoUrl: true, role: true } },
      },
    });
    res.status(201).json(block);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(409).json({ message: 'Este usuario ya está bloqueado' });
    }
    console.error('Error blocking user:', error);
    res.status(500).json({ message: 'No se pudo bloquear al usuario' });
  }
}

export async function deleteBlock(req: Request, res: Response) {
  if (!req.params.userId || req.params.userId.length > 100) {
    return res.status(400).json({ message: 'El usuario que deseas desbloquear no es válido' });
  }
  try {
    const deleted = await prisma.userBlock.deleteMany({
      where: { blockerId: req.auth!.userId, blockedUserId: req.params.userId },
    });
    if (deleted.count === 0) return res.status(404).json({ message: 'Bloqueo no encontrado' });
    res.status(204).send();
  } catch (error) {
    console.error('Error unblocking user:', error);
    res.status(500).json({ message: 'No se pudo desbloquear al usuario' });
  }
}

export async function getAdminQueue(req: Request, res: Response) {
  const limit = parseQueueLimit(req.query.limit);
  const overdueBefore = new Date(Date.now() - 24 * 60 * 60 * 1000);

  try {
    const [
      reports,
      pendingProfiles,
      pendingPhotos,
      reportCount,
      profileCount,
      photoCount,
      overdueReports,
      overdueProfiles,
      overduePhotos,
    ] = await Promise.all([
      prisma.contentReport.findMany({
        where: { status: { in: ACTIVE_REPORT_STATUSES } },
        select: {
          id: true,
          reporterId: true,
          targetUserId: true,
          technicianId: true,
          profilePhotoSubmissionId: true,
          contentType: true,
          reason: true,
          details: true,
          status: true,
          reviewedById: true,
          createdAt: true,
          updatedAt: true,
          reporter: { select: { id: true, name: true, email: true } },
          targetUser: { select: { id: true, name: true, email: true, moderationStatus: true } },
          reviewedBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'asc' },
        take: limit,
      }),
      prisma.technician.findMany({
        where: {
          moderationStatus: TechnicianModerationStatus.PENDING,
          user: { moderationStatus: UserModerationStatus.ACTIVE },
        },
        select: {
          id: true,
          userId: true,
          specializations: true,
          location: true,
          companyName: true,
          moderationStatus: true,
          moderationSubmittedAt: true,
          user: { select: { id: true, name: true, email: true, phone: true } },
        },
        orderBy: { moderationSubmittedAt: 'asc' },
        take: limit,
      }),
      prisma.profilePhotoSubmission.findMany({
        where: { status: ProfilePhotoModerationStatus.PENDING },
        select: {
          id: true,
          userId: true,
          imageData: true,
          status: true,
          submittedAt: true,
          user: { select: { id: true, name: true, email: true, role: true } },
        },
        orderBy: { submittedAt: 'asc' },
        take: limit,
      }),
      prisma.contentReport.count({ where: { status: { in: ACTIVE_REPORT_STATUSES } } }),
      prisma.technician.count({
        where: {
          moderationStatus: TechnicianModerationStatus.PENDING,
          user: { moderationStatus: UserModerationStatus.ACTIVE },
        },
      }),
      prisma.profilePhotoSubmission.count({ where: { status: ProfilePhotoModerationStatus.PENDING } }),
      prisma.contentReport.count({
        where: { status: { in: ACTIVE_REPORT_STATUSES }, createdAt: { lte: overdueBefore } },
      }),
      prisma.technician.count({
        where: {
          moderationStatus: TechnicianModerationStatus.PENDING,
          moderationSubmittedAt: { lte: overdueBefore },
          user: { moderationStatus: UserModerationStatus.ACTIVE },
        },
      }),
      prisma.profilePhotoSubmission.count({
        where: { status: ProfilePhotoModerationStatus.PENDING, submittedAt: { lte: overdueBefore } },
      }),
    ]);

    res.json({
      reports: reports.map(({ targetUser, ...item }) => {
        const { moderationStatus, ...safeTargetUser } = targetUser;
        return {
          ...item,
          targetUser: {
            ...safeTargetUser,
            accountModerationStatus: moderationStatus,
          },
          ...moderationAge(item.createdAt),
        };
      }),
      pendingProfiles: pendingProfiles.map(({ moderationStatus, ...item }) => ({
        ...item,
        technicianModerationStatus: moderationStatus,
        submittedAt: item.moderationSubmittedAt,
        ...moderationAge(item.moderationSubmittedAt),
      })),
      pendingPhotos: pendingPhotos.map(({ imageData, ...item }) => ({
        ...item,
        photoUrl: imageData,
        ...moderationAge(item.submittedAt),
      })),
      counts: {
        reports: reportCount,
        pendingProfiles: profileCount,
        pendingPhotos: photoCount,
        overdue: overdueReports + overdueProfiles + overduePhotos,
      },
    });
  } catch (error) {
    console.error('Error loading moderation queue:', error);
    res.status(500).json({ message: 'No se pudo cargar la cola de moderación' });
  }
}

export async function moderateTechnician(req: Request, res: Response) {
  const decision = req.body?.decision;
  const reason = cleanOptionalText(req.body?.reason, 1000);
  if (!['APPROVE', 'REJECT', 'SUSPEND'].includes(decision)) {
    return res.status(400).json({ message: 'La decisión no es válida' });
  }
  if (reason === undefined || ((decision === 'REJECT' || decision === 'SUSPEND') && !reason)) {
    return res.status(400).json({ message: 'Indica una razón breve para esta decisión' });
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const technician = await tx.technician.findUnique({
        where: { id: req.params.id },
        select: {
          id: true,
          moderationStatus: true,
          moderationSubmittedAt: true,
          user: { select: { moderationStatus: true } },
        },
      });
      if (!technician) throw new ModerationRequestError(404, 'Técnico no encontrado');
      if (technician.user.moderationStatus !== UserModerationStatus.ACTIVE) {
        throw new ModerationRequestError(409, 'La cuenta de este técnico está suspendida');
      }

      const targetStatus = technicianTargetStatus(technician.moderationStatus, decision);
      if (!targetStatus) {
        throw new ModerationRequestError(409, `No se puede ${decision.toLowerCase()} un perfil ${technician.moderationStatus}`);
      }

      const claimed = await tx.technician.updateMany({
        where: {
          id: technician.id,
          moderationStatus: technician.moderationStatus,
          moderationSubmittedAt: technician.moderationSubmittedAt,
          user: { moderationStatus: UserModerationStatus.ACTIVE },
        },
        data: {
          moderationStatus: targetStatus,
          moderationReason: reason,
          moderatedAt: new Date(),
          moderatedById: req.auth!.userId,
        },
      });
      if (claimed.count !== 1) {
        throw new ModerationRequestError(409, 'El perfil cambió mientras lo revisabas; actualiza la cola');
      }
      const result = await tx.technician.findUnique({
        where: { id: technician.id },
        select: {
          id: true,
          userId: true,
          moderationStatus: true,
          moderationReason: true,
          moderatedAt: true,
        },
      });
      if (!result) throw new ModerationRequestError(409, 'El perfil ya no está disponible');
      await tx.moderationAuditLog.create({
        data: {
          actorId: req.auth!.userId,
          action: `TECHNICIAN_${decision}`,
          targetType: 'TECHNICIAN',
          targetId: technician.id,
          fromStatus: technician.moderationStatus,
          toStatus: targetStatus,
          reason,
        },
      });
      return result;
    });
    const { moderationStatus, moderationReason, ...safeTechnician } = updated;
    res.json({
      ...safeTechnician,
      technicianModerationStatus: moderationStatus,
      technicianModerationReason: moderationReason,
    });
  } catch (error) {
    sendModerationError(error, res, 'No se pudo moderar el perfil técnico');
  }
}

export async function moderateProfilePhoto(req: Request, res: Response) {
  const decision = req.body?.decision;
  const reason = cleanOptionalText(req.body?.reason, 1000);
  if (!['APPROVE', 'REJECT'].includes(decision)) {
    return res.status(400).json({ message: 'La decisión no es válida' });
  }
  if (reason === undefined || (decision === 'REJECT' && !reason)) {
    return res.status(400).json({ message: 'Indica una razón breve para rechazar la foto' });
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const submission = await tx.profilePhotoSubmission.findUnique({
        where: { id: req.params.id },
        select: { id: true, userId: true, imageData: true, status: true },
      });
      if (!submission) throw new ModerationRequestError(404, 'Foto pendiente no encontrada');
      if (submission.status !== ProfilePhotoModerationStatus.PENDING) {
        throw new ModerationRequestError(409, 'Esta foto ya fue moderada');
      }

      const status = decision === 'APPROVE'
        ? ProfilePhotoModerationStatus.APPROVED
        : ProfilePhotoModerationStatus.REJECTED;

      // Claim the pending submission before publishing or rejecting it. A
      // second moderator (or a replacement upload) must lose this conditional
      // transition instead of applying contradictory side effects.
      const claimed = await tx.profilePhotoSubmission.updateMany({
        where: { id: submission.id, status: ProfilePhotoModerationStatus.PENDING },
        data: {
          pendingKey: null,
          status,
          reviewedAt: new Date(),
          reviewedById: req.auth!.userId,
          reviewNote: reason,
        },
      });
      if (claimed.count !== 1) {
        throw new ModerationRequestError(409, 'La foto cambió mientras la revisabas; actualiza la cola');
      }

      if (decision === 'APPROVE') {
        const current = await tx.user.findUnique({
          where: { id: submission.userId },
          select: { photoUrl: true },
        });
        if (!current) throw new ModerationRequestError(404, 'Usuario no encontrado');
        await tx.user.update({
          where: { id: submission.userId },
          data: { photoUrl: submission.imageData },
        });
        await tx.profileChangeHistory.create({
          data: {
            userId: submission.userId,
            fieldName: 'photoUrl',
            oldValue: current.photoUrl ? '[previous approved photo]' : null,
            newValue: '[moderated photo approved]',
            changedBy: req.auth!.userId,
            changeReason: reason || 'Foto aprobada por moderación',
          },
        });
      }

      const result = await tx.profilePhotoSubmission.update({
        where: { id: submission.id },
        data: {
          imageData: '',
        },
        select: {
          id: true,
          userId: true,
          status: true,
          reviewedAt: true,
          reviewNote: true,
        },
      });
      await tx.moderationAuditLog.create({
        data: {
          actorId: req.auth!.userId,
          action: `PROFILE_PHOTO_${decision}`,
          targetType: 'PROFILE_PHOTO',
          targetId: submission.id,
          fromStatus: submission.status,
          toStatus: status,
          reason,
        },
      });
      return result;
    });
    const { status, ...safePhoto } = updated;
    res.json({
      ...safePhoto,
      photoModerationStatus: status,
    });
  } catch (error) {
    sendModerationError(error, res, 'No se pudo moderar la foto');
  }
}

export async function resolveReport(req: Request, res: Response) {
  const status = req.body?.status as ContentReportStatus;
  const action = req.body?.action as ModerationAction;
  const resolutionNote = cleanOptionalText(req.body?.resolutionNote, 1000);
  if (!FINAL_REPORT_STATUSES.has(status) || !REPORT_ACTIONS.has(action)) {
    return res.status(400).json({ message: 'El estado o la acción no son válidos' });
  }
  if (resolutionNote === undefined || !resolutionNote) {
    return res.status(400).json({ message: 'La resolución debe incluir una nota interna' });
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const report = await tx.contentReport.findUnique({
        where: { id: req.params.id },
        select: {
          id: true,
          targetUserId: true,
          technicianId: true,
          contentType: true,
          contentFingerprint: true,
          status: true,
          reviewedById: true,
        },
      });
      if (!report) throw new ModerationRequestError(404, 'Reporte no encontrado');
      if (!ACTIVE_REPORT_STATUSES.includes(report.status)) {
        throw new ModerationRequestError(409, 'Este reporte ya tiene una resolución final');
      }
      if (status === ContentReportStatus.DISMISSED && action !== ModerationAction.NONE) {
        throw new ModerationRequestError(400, 'Un reporte descartado no puede aplicar una sanción');
      }

      if (
        report.status === ContentReportStatus.UNDER_REVIEW &&
        report.reviewedById &&
        report.reviewedById !== req.auth!.userId
      ) {
        throw new ModerationRequestError(409, 'Otro administrador está revisando este reporte');
      }

      // Atomically claim the final decision before applying any sanction. The
      // entire transaction rolls back if a side effect fails, while concurrent
      // requests (including double-clicks by the same reviewer) lose because
      // the source status no longer matches after the winner commits.
      const decisionWhere = report.status === ContentReportStatus.OPEN
        ? { id: report.id, status: ContentReportStatus.OPEN, reviewedById: null }
        : {
            id: report.id,
            status: ContentReportStatus.UNDER_REVIEW,
            reviewedById: report.reviewedById || null,
          };
      const decisionClaim = await tx.contentReport.updateMany({
        where: decisionWhere,
        data: {
          status,
          action,
          resolutionNote,
          reviewedById: req.auth!.userId,
          reviewedAt: new Date(),
          dedupeKey: null,
        },
      });
      if (decisionClaim.count !== 1) {
        throw new ModerationRequestError(409, 'El reporte cambió mientras lo revisabas; actualiza la cola');
      }

      if (action === ModerationAction.CONTENT_REMOVED) {
        if (report.contentType !== ReportContentType.PHOTO || !report.contentFingerprint) {
          throw new ModerationRequestError(400, 'La eliminación de contenido solo aplica a la foto reportada');
        }
        const target = await tx.user.findUnique({
          where: { id: report.targetUserId },
          select: { photoUrl: true, deletedAt: true },
        });
        if (!target?.photoUrl || target.deletedAt || sha256(target.photoUrl) !== report.contentFingerprint) {
          throw new ModerationRequestError(409, 'La foto reportada ya cambió; revisa el contenido actual');
        }
        const removed = await tx.user.updateMany({
          where: { id: report.targetUserId, photoUrl: target.photoUrl },
          data: { photoUrl: null },
        });
        if (removed.count !== 1) {
          throw new ModerationRequestError(409, 'La foto reportada cambió mientras la revisabas');
        }
        await tx.profileChangeHistory.create({
          data: {
            userId: report.targetUserId,
            fieldName: 'photoUrl',
            oldValue: '[reported approved photo]',
            newValue: null,
            changedBy: req.auth!.userId,
            changeReason: `Reporte ${report.id}: ${resolutionNote}`,
          },
        });
      }

      if (action === ModerationAction.TECHNICIAN_SUSPENDED) {
        if (!report.technicianId) {
          throw new ModerationRequestError(400, 'El reporte no corresponde a un perfil técnico');
        }
        const technician = await tx.technician.findUnique({
          where: { id: report.technicianId },
          select: { moderationStatus: true },
        });
        if (!technician || technician.moderationStatus !== TechnicianModerationStatus.APPROVED) {
          throw new ModerationRequestError(409, 'El perfil técnico no está actualmente aprobado');
        }
        const suspended = await tx.technician.updateMany({
          where: {
            id: report.technicianId,
            moderationStatus: TechnicianModerationStatus.APPROVED,
          },
          data: {
            moderationStatus: TechnicianModerationStatus.SUSPENDED,
            moderationReason: resolutionNote,
            moderatedAt: new Date(),
            moderatedById: req.auth!.userId,
          },
        });
        if (suspended.count !== 1) {
          throw new ModerationRequestError(409, 'El perfil técnico cambió mientras lo revisabas');
        }
      }

      if (action === ModerationAction.USER_SUSPENDED) {
        const target = await tx.user.findUnique({
          where: { id: report.targetUserId },
          select: { id: true, role: true, moderationStatus: true, deletedAt: true },
        });
        if (!target || target.deletedAt) {
          throw new ModerationRequestError(404, 'Usuario reportado no encontrado');
        }
        if (target.role === 'admin') {
          throw new ModerationRequestError(403, 'No se puede suspender una cuenta administrativa desde un reporte');
        }
        if (target.moderationStatus === UserModerationStatus.SUSPENDED) {
          throw new ModerationRequestError(409, 'La cuenta reportada ya está suspendida');
        }
        const suspended = await tx.user.updateMany({
          where: {
            id: target.id,
            role: { not: 'admin' },
            moderationStatus: UserModerationStatus.ACTIVE,
          },
          data: {
            moderationStatus: UserModerationStatus.SUSPENDED,
            moderationReason: resolutionNote,
            moderatedAt: new Date(),
            moderatedById: req.auth!.userId,
          },
        });
        if (suspended.count !== 1) {
          throw new ModerationRequestError(409, 'La cuenta cambió mientras revisabas el reporte');
        }
      }

      const result = await tx.contentReport.findUnique({
        where: { id: report.id },
        select: {
          id: true,
          status: true,
          action: true,
          resolutionNote: true,
          reviewedAt: true,
          updatedAt: true,
        },
      });
      await tx.moderationAuditLog.create({
        data: {
          actorId: req.auth!.userId,
          action: `REPORT_${status}`,
          targetType: 'REPORT',
          targetId: report.id,
          fromStatus: report.status,
          toStatus: status,
          reason: resolutionNote,
          metadata: { moderationAction: action },
        },
      });
      return result;
    });
    res.json(updated);
  } catch (error) {
    sendModerationError(error, res, 'No se pudo resolver el reporte');
  }
}

export async function moderateUser(req: Request, res: Response) {
  const decision = req.body?.decision;
  const reason = cleanOptionalText(req.body?.reason, 1000);
  if (!['SUSPEND', 'RESTORE'].includes(decision)) {
    return res.status(400).json({ message: 'La decisión no es válida' });
  }
  if (reason === undefined || !reason) {
    return res.status(400).json({ message: 'Indica una razón breve para esta decisión' });
  }
  if (req.params.id === req.auth!.userId) {
    return res.status(400).json({ message: 'No puedes cambiar el estado de tu propia cuenta' });
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: req.params.id },
        select: { id: true, role: true, moderationStatus: true, deletedAt: true },
      });
      if (!user) throw new ModerationRequestError(404, 'Usuario no encontrado');
      // A deleted tombstone cannot receive a new sanction, but an admin must
      // be able to lift its existing sanction after an external appeal so the
      // privacy-safe email marker no longer prevents account recreation.
      if (user.deletedAt && decision !== 'RESTORE') {
        throw new ModerationRequestError(404, 'Usuario no encontrado');
      }
      if (user.role === 'admin') {
        throw new ModerationRequestError(403, 'No puedes moderar otra cuenta administrativa');
      }

      const targetStatus = decision === 'SUSPEND'
        ? UserModerationStatus.SUSPENDED
        : UserModerationStatus.ACTIVE;
      if (user.moderationStatus === targetStatus) {
        throw new ModerationRequestError(409, `La cuenta ya está ${targetStatus.toLowerCase()}`);
      }

      const changed = await tx.user.updateMany({
        where: {
          id: user.id,
          role: { not: 'admin' },
          deletedAt: user.deletedAt ? { not: null } : null,
          moderationStatus: user.moderationStatus,
        },
        data: {
          moderationStatus: targetStatus,
          moderationReason: decision === 'SUSPEND' ? reason : null,
          moderatedAt: new Date(),
          moderatedById: req.auth!.userId,
        },
      });
      if (changed.count !== 1) {
        throw new ModerationRequestError(409, 'La cuenta cambió mientras la moderabas; actualiza la lista');
      }
      const result = await tx.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          moderationStatus: true,
          moderationReason: true,
          moderatedAt: true,
        },
      });
      if (!result) throw new ModerationRequestError(409, 'La cuenta ya no está disponible');
      await tx.moderationAuditLog.create({
        data: {
          actorId: req.auth!.userId,
          action: `USER_${decision}`,
          targetType: 'USER',
          targetId: user.id,
          fromStatus: user.moderationStatus,
          toStatus: targetStatus,
          reason,
        },
      });
      return result;
    });
    const { moderationStatus, moderationReason, ...safeUser } = updated;
    res.json({
      ...safeUser,
      accountModerationStatus: moderationStatus,
      accountModerationReason: moderationReason,
    });
  } catch (error) {
    sendModerationError(error, res, 'No se pudo cambiar el estado de la cuenta');
  }
}

export async function claimReport(req: Request, res: Response) {
  try {
    const claimed = await prisma.$transaction(async (tx) => {
      const report = await tx.contentReport.findUnique({
        where: { id: req.params.id },
        select: { id: true, status: true, reviewedById: true, updatedAt: true },
      });
      if (!report) throw new ModerationRequestError(404, 'Reporte no encontrado');
      if (!ACTIVE_REPORT_STATUSES.includes(report.status)) {
        throw new ModerationRequestError(409, 'Este reporte ya tiene una resolución final');
      }
      if (report.status === ContentReportStatus.UNDER_REVIEW) {
        if (report.reviewedById === req.auth!.userId) return report;
        throw new ModerationRequestError(409, 'Otro administrador está revisando este reporte');
      }

      const result = await tx.contentReport.updateMany({
        where: { id: report.id, status: ContentReportStatus.OPEN },
        data: {
          status: ContentReportStatus.UNDER_REVIEW,
          reviewedById: req.auth!.userId,
        },
      });
      if (result.count !== 1) {
        throw new ModerationRequestError(409, 'Otro administrador tomó este reporte');
      }
      await tx.moderationAuditLog.create({
        data: {
          actorId: req.auth!.userId,
          action: 'REPORT_CLAIMED',
          targetType: 'REPORT',
          targetId: report.id,
          fromStatus: ContentReportStatus.OPEN,
          toStatus: ContentReportStatus.UNDER_REVIEW,
        },
      });
      return tx.contentReport.findUnique({
        where: { id: report.id },
        select: { id: true, status: true, reviewedById: true, updatedAt: true },
      });
    });
    res.json(claimed);
  } catch (error) {
    sendModerationError(error, res, 'No se pudo tomar el reporte');
  }
}

function technicianTargetStatus(
  current: TechnicianModerationStatus,
  decision: string
): TechnicianModerationStatus | null {
  const approvable = new Set<TechnicianModerationStatus>([
    TechnicianModerationStatus.PENDING,
    TechnicianModerationStatus.REJECTED,
    TechnicianModerationStatus.SUSPENDED,
  ]);
  if (decision === 'APPROVE' && approvable.has(current)) return TechnicianModerationStatus.APPROVED;
  if (decision === 'REJECT' && current === TechnicianModerationStatus.PENDING) {
    return TechnicianModerationStatus.REJECTED;
  }
  if (decision === 'SUSPEND' && current === TechnicianModerationStatus.APPROVED) {
    return TechnicianModerationStatus.SUSPENDED;
  }
  return null;
}

class ModerationRequestError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

function sendModerationError(error: unknown, res: Response, fallback: string) {
  if (error instanceof ModerationRequestError) {
    res.status(error.status).json({ message: error.message });
    return;
  }
  console.error(fallback, error);
  res.status(500).json({ message: fallback });
}
