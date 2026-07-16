import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Spacing, Typography } from '@/constants/theme';

export interface LegalSection {
  title: string;
  paragraphs: string[];
  bullets?: string[];
}

export function LegalScreen({
  effectiveDate,
  intro,
  sections,
  title,
}: {
  effectiveDate: string;
  intro: string;
  sections: LegalSection[];
  title: string;
}) {
  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>TÉCNICOS EN RD</Text>
        <Text accessibilityRole="header" style={styles.title}>{title}</Text>
        <Text style={styles.date}>Vigente desde {effectiveDate}</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.intro}>{intro}</Text>
        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>{section.title}</Text>
            {section.paragraphs.map((paragraph) => (
              <Text key={paragraph} style={styles.paragraph}>{paragraph}</Text>
            ))}
            {section.bullets?.map((bullet) => (
              <View key={bullet} style={styles.bulletRow}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.bulletText}>{bullet}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { backgroundColor: Colors.sand, gap: Spacing.md, padding: Spacing.md, paddingBottom: Spacing.xxl },
  hero: { backgroundColor: Colors.ink, borderRadius: Radius.xl, gap: 5, padding: Spacing.lg },
  eyebrow: { ...Typography.caption, color: Colors.clay100, fontWeight: '800', letterSpacing: 1.2 },
  title: { ...Typography.title, color: Colors.cream },
  date: { ...Typography.caption, color: '#BCC4D2' },
  card: {
    backgroundColor: Colors.cream,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.lg,
    padding: Spacing.lg,
  },
  intro: { ...Typography.body, color: Colors.charcoal, fontWeight: '600' },
  section: { gap: Spacing.sm },
  sectionTitle: { ...Typography.subheading, color: Colors.ink },
  paragraph: { ...Typography.body, color: Colors.charcoal },
  bulletRow: { alignItems: 'flex-start', flexDirection: 'row', gap: Spacing.sm },
  bullet: { ...Typography.body, color: Colors.clay, fontWeight: '900' },
  bulletText: { ...Typography.body, color: Colors.charcoal, flex: 1 },
});
