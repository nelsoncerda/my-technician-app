import { Stack, router } from 'expo-router';
import {
  BadgeCheck,
  CalendarCheck2,
  CheckCircle2,
  MapPin,
  Search,
  ShieldCheck,
  UserRoundCheck,
  Wrench,
  type LucideIcon,
} from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Screen } from '@/components/ui';
import { BrandColors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/providers/auth';

const BENEFITS: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: BadgeCheck,
    title: 'Perfiles más claros',
    description: 'Compara especialidades, zona, verificación y valoraciones antes de elegir.',
  },
  {
    icon: CalendarCheck2,
    title: 'Reservas organizadas',
    description: 'Guarda el horario, la dirección y el estado del servicio en una sola agenda.',
  },
  {
    icon: UserRoundCheck,
    title: 'Talento local',
    description: 'Encuentra profesionales que conocen Santiago y las comunidades del Cibao.',
  },
  {
    icon: ShieldCheck,
    title: 'Privacidad primero',
    description: 'El mapa publica áreas aproximadas; nunca domicilios ni ubicaciones en vivo.',
  },
];

const STEPS: { icon: LucideIcon; title: string; description: string }[] = [
  { icon: Search, title: 'Busca', description: 'Escribe el servicio o usa los filtros de especialidad y zona.' },
  { icon: Wrench, title: 'Compara', description: 'Revisa el perfil, la calificación y el área general de servicio.' },
  { icon: CheckCircle2, title: 'Reserva', description: 'Elige un horario disponible y sigue cada etapa de la visita.' },
];

export default function AboutScreen() {
  const { isAuthenticated } = useAuth();

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: 'Cómo funciona' }} />

      <View style={styles.hero}>
        <View style={styles.locationPill}>
          <MapPin color={BrandColors.teal100} size={16} accessible={false} />
          <Text style={styles.locationText}>Hecho en Santiago para el Cibao</Text>
        </View>
        <Text style={styles.heroTitle}>Necesidades reales, profesionales locales.</Text>
        <Text style={styles.heroDescription}>
          Técnicos en RD te ayuda a encontrar, comparar y reservar servicios para el hogar con información clara.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.eyebrow}>Nuestro propósito</Text>
        <Text style={styles.sectionTitle}>Menos incertidumbre. Más confianza para resolver.</Text>
        <Text style={styles.sectionDescription}>
          Reunimos perfiles, especialidades, zonas de servicio y calificaciones para que cada persona decida mejor y cada técnico construya una reputación con su trabajo.
        </Text>
        <View style={styles.benefitGrid}>
          {BENEFITS.map(({ description, icon: Icon, title }) => (
            <View key={title} style={styles.benefitCard}>
              <View style={styles.benefitIcon} accessible={false}>
                <Icon color={BrandColors.teal700} size={22} />
              </View>
              <Text style={styles.cardTitle}>{title}</Text>
              <Text style={styles.cardDescription}>{description}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.stepsSection}>
        <Text style={styles.eyebrow}>Cómo funciona</Text>
        <Text style={styles.sectionTitle}>De la búsqueda a la visita en tres pasos</Text>
        <View style={styles.stepList}>
          {STEPS.map(({ description, icon: Icon, title }, index) => (
            <View key={title} style={styles.stepCard}>
              <View style={styles.stepTop}>
                <View style={styles.stepIcon} accessible={false}>
                  <Icon color={BrandColors.ocean700} size={22} />
                </View>
                <Text style={styles.stepNumber}>0{index + 1}</Text>
              </View>
              <Text style={styles.cardTitle}>{title}</Text>
              <Text style={styles.cardDescription}>{description}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.ctaCard}>
        <Text style={styles.ctaTitle}>¿Qué necesitas resolver hoy?</Text>
        <Text style={styles.ctaDescription}>
          Explora profesionales locales o crea una cuenta para administrar tus reservas.
        </Text>
        <View style={styles.ctaActions}>
          <Button
            fullWidth
            label="Buscar técnicos"
            onPress={() => router.replace('/')}
            size="lg"
            variant="outline"
          />
          {!isAuthenticated ? (
            <Button
              fullWidth
              label="Crear una cuenta"
              onPress={() => router.push('/sign-up')}
              size="lg"
            />
          ) : null}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    alignSelf: 'center',
    gap: Spacing.xl,
    maxWidth: 760,
    paddingHorizontal: Spacing.md,
    width: '100%',
  },
  hero: {
    ...Shadows.card,
    backgroundColor: BrandColors.ink,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
  },
  locationPill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: BrandColors.ocean700,
    borderRadius: Radius.pill,
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  locationText: { color: BrandColors.teal100, fontSize: Typography.caption.fontSize, fontWeight: '700' },
  heroTitle: {
    color: BrandColors.cream,
    fontSize: Typography.title.fontSize,
    fontWeight: '800',
    lineHeight: Typography.title.lineHeight,
    marginTop: Spacing.lg,
  },
  heroDescription: {
    color: '#D5DBE7',
    fontSize: Typography.body.fontSize,
    lineHeight: Typography.body.lineHeight,
    marginTop: Spacing.sm,
  },
  section: { gap: Spacing.md },
  eyebrow: {
    color: BrandColors.clay700,
    fontSize: Typography.caption.fontSize,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    color: BrandColors.ink,
    fontSize: Typography.heading.fontSize,
    fontWeight: '800',
    lineHeight: Typography.heading.lineHeight,
  },
  sectionDescription: { color: BrandColors.charcoal, fontSize: Typography.body.fontSize, lineHeight: Typography.body.lineHeight },
  benefitGrid: { gap: Spacing.sm },
  benefitCard: {
    backgroundColor: BrandColors.cream,
    borderColor: BrandColors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
  },
  benefitIcon: {
    alignItems: 'center',
    backgroundColor: BrandColors.teal50,
    borderRadius: Radius.md,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  cardTitle: { color: BrandColors.ink, fontSize: Typography.subheading.fontSize, fontWeight: '800', marginTop: Spacing.sm },
  cardDescription: { color: BrandColors.charcoal, fontSize: Typography.body.fontSize, lineHeight: Typography.body.lineHeight, marginTop: Spacing.xs },
  stepsSection: {
    backgroundColor: BrandColors.cream,
    borderColor: BrandColors.border,
    borderRadius: Radius.xl,
    borderWidth: 1,
    gap: Spacing.md,
    padding: Spacing.md,
  },
  stepList: { gap: Spacing.sm },
  stepCard: { backgroundColor: BrandColors.sand, borderRadius: Radius.lg, padding: Spacing.md },
  stepTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  stepIcon: {
    alignItems: 'center',
    backgroundColor: BrandColors.ocean50,
    borderRadius: Radius.md,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  stepNumber: { color: BrandColors.ocean700, fontSize: Typography.label.fontSize, fontWeight: '900' },
  ctaCard: { backgroundColor: BrandColors.ocean700, borderRadius: Radius.xl, padding: Spacing.lg },
  ctaTitle: { color: BrandColors.cream, fontSize: Typography.heading.fontSize, fontWeight: '800', textAlign: 'center' },
  ctaDescription: {
    color: BrandColors.ocean100,
    fontSize: Typography.body.fontSize,
    lineHeight: Typography.body.lineHeight,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  ctaActions: { gap: Spacing.sm, marginTop: Spacing.lg },
});
