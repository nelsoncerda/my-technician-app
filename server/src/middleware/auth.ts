import { NextFunction, Request, RequestHandler, Response } from 'express';
import prisma from '../prisma';
import { AuthRole, normalizeAuthRole, verifyAuthToken } from '../security/token';

export interface AuthContext {
  userId: string;
  role: AuthRole;
  accountSuspended?: boolean;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

function unauthorized(res: Response) {
  return res.status(401).json({ message: 'Autenticación requerida' });
}

function forbidden(res: Response) {
  return res.status(403).json({ message: 'No autorizado' });
}

function accountSuspended(res: Response, reason?: string | null) {
  return res.status(403).json({
    code: 'ACCOUNT_SUSPENDED',
    message: 'Esta cuenta está suspendida. Contacta a soporte si deseas apelar.',
    accountModerationStatus: 'SUSPENDED',
    accountModerationReason: reason || null,
    limitedAccess: true,
    supportUrl: '/support',
  });
}

export const requireAuth: RequestHandler = async (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) {
    unauthorized(res);
    return;
  }

  const payload = verifyAuthToken(authorization.slice('Bearer '.length).trim());
  if (!payload) {
    unauthorized(res);
    return;
  }

  try {
    // The database remains authoritative for account existence and current role.
    // This immediately invalidates deleted users and stale role claims.
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, moderationStatus: true, moderationReason: true, deletedAt: true },
    });
    if (!user || user.deletedAt) {
      unauthorized(res);
      return;
    }
    if (user.moderationStatus === 'SUSPENDED') {
      accountSuspended(res, user.moderationReason);
      return;
    }

    req.auth = { userId: user.id, role: normalizeAuthRole(user.role) };
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Limited authentication for rights that must remain available after an
 * account suspension: own-report history and permanent self-service deletion.
 * Never attach this middleware to general application or admin routes.
 */
export const requireAuthAllowSuspended: RequestHandler = async (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) {
    unauthorized(res);
    return;
  }
  const payload = verifyAuthToken(authorization.slice('Bearer '.length).trim());
  if (!payload) {
    unauthorized(res);
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, moderationStatus: true, moderationReason: true, deletedAt: true },
    });
    if (!user || user.deletedAt) {
      unauthorized(res);
      return;
    }
    req.auth = {
      userId: user.id,
      role: normalizeAuthRole(user.role),
      accountSuspended: user.moderationStatus === 'SUSPENDED',
    };
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Adds authenticated context to otherwise-public routes. A missing token keeps
 * the request anonymous; a supplied but invalid/stale token is rejected so a
 * blocked user cannot bypass visibility rules by sending a bad credential.
 */
export const optionalAuth: RequestHandler = async (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    next();
    return;
  }
  if (!authorization.startsWith('Bearer ')) {
    unauthorized(res);
    return;
  }

  const payload = verifyAuthToken(authorization.slice('Bearer '.length).trim());
  if (!payload) {
    unauthorized(res);
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, moderationStatus: true, moderationReason: true, deletedAt: true },
    });
    if (!user || user.deletedAt) {
      unauthorized(res);
      return;
    }
    if (user.moderationStatus === 'SUSPENDED') {
      accountSuspended(res, user.moderationReason);
      return;
    }
    req.auth = { userId: user.id, role: normalizeAuthRole(user.role) };
    next();
  } catch (error) {
    next(error);
  }
};

export function requireRole(...roles: AuthRole[]): RequestHandler {
  return (req, res, next) => {
    if (!req.auth) {
      unauthorized(res);
      return;
    }
    if (!roles.includes(req.auth.role)) {
      forbidden(res);
      return;
    }
    next();
  };
}

export function requireSelfOrAdmin(paramName = 'id'): RequestHandler {
  return (req, res, next) => {
    if (!req.auth) {
      unauthorized(res);
      return;
    }
    if (req.auth.role !== 'admin' && req.params[paramName] !== req.auth.userId) {
      forbidden(res);
      return;
    }
    next();
  };
}

/** Active administrators may delete other accounts; suspended administrators
 * retain only the same self-deletion right as every other suspended user. */
export function requireSelfOrActiveAdmin(paramName = 'id'): RequestHandler {
  return (req, res, next) => {
    if (!req.auth) {
      unauthorized(res);
      return;
    }
    const isSelf = req.params[paramName] === req.auth.userId;
    const isActiveAdmin = req.auth.role === 'admin' && !req.auth.accountSuspended;
    if (!isSelf && !isActiveAdmin) {
      forbidden(res);
      return;
    }
    next();
  };
}

type TechnicianIdSource = 'params' | 'body';

export function requireTechnicianOwnerOrAdmin(
  fieldName = 'technicianId',
  source: TechnicianIdSource = 'params'
): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) {
      unauthorized(res);
      return;
    }
    if (req.auth.role === 'admin') {
      next();
      return;
    }
    if (req.auth.role !== 'technician') {
      forbidden(res);
      return;
    }

    const technicianId = source === 'params' ? req.params[fieldName] : req.body?.[fieldName];
    if (typeof technicianId !== 'string' || !technicianId) {
      res.status(400).json({ message: 'ID del técnico requerido' });
      return;
    }

    try {
      const technician = await prisma.technician.findUnique({
        where: { id: technicianId },
        select: { userId: true },
      });
      if (!technician || technician.userId !== req.auth.userId) {
        forbidden(res);
        return;
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

export const requireAdmin = requireRole('admin');
