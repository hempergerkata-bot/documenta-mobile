import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  explanationFor,
  localizedExplanationSections,
  type DocumentIntelligenceResult,
  type ExplanationLanguage,
  type Fact,
  type ReviewDecision,
} from '@/utils/documentIntelligence';
import { useColors } from '@/hooks/useColors';
import { useTranslation } from '@/hooks/useTranslation';
import { confidenceLabel, deadlineKindLabel, isAppLanguage, isExplanationLanguage, languageName, riskLabel } from '@/utils/localization';
import { useApp } from '@/context/AppContext';

type Props = {
  result: DocumentIntelligenceResult;
  compact?: boolean;
  onReview?: () => void;
  onReviewDecision?: (field: string, decision: ReviewDecision) => void;
  explanationLanguage?: ExplanationLanguage;
};

function factText<T>(fact: Fact<T>, fallback = '—') {
  if (fact.value === undefined) return fallback;
  if (Array.isArray(fact.value)) return fact.value.join(', ');
  return String(fact.value);
}

function Evidence({ fact }: { fact: Pick<Fact<unknown>, 'evidence'> }) {
  const colors = useColors();
  const { t } = useTranslation();
  if (!fact.evidence.length) return null;
  return (
    <Text style={[styles.evidence, { color: colors.mutedForeground }]}>
      {t('intelligence.evidence')}: „{fact.evidence[0].text}“
    </Text>
  );
}

function FactRow({ label, fact }: { label: string; fact: Fact<unknown> }) {
  const colors = useColors();
  const { language } = useTranslation();
  const uncertain = fact.confidence === 'low' || fact.confidence === 'unknown';
  return (
    <View style={[styles.factRow, { borderBottomColor: colors.border }]}>
      <View style={styles.factCopy}>
        <Text style={[styles.factLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[styles.factValue, { color: colors.navy }]}>{factText(fact)}</Text>
        <Evidence fact={fact} />
      </View>
      <Text style={[styles.confidence, { color: uncertain ? colors.coral : colors.sageDeep }]}>
        {confidenceLabel(fact.confidence, language)}
      </Text>
    </View>
  );
}

function TextBlock({ label, text }: { label: string; text: string }) {
  const colors = useColors();
  return (
    <View style={[styles.insight, { backgroundColor: colors.background }]}>
      <Text style={[styles.insightLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.insightValue, { color: colors.navy }]}>{text}</Text>
    </View>
  );
}

export function DocumentIntelligencePanel({
  result,
  compact = false,
  onReview,
  onReviewDecision,
  explanationLanguage,
}: Props) {
  const colors = useColors();
  const { settings } = useApp();
  const { language, t, date, currency } = useTranslation();
  const requestedContentLanguage = explanationLanguage ?? settings.explanationLanguage;
  const explanationSupported = isExplanationLanguage(requestedContentLanguage);
  const contentLanguage: ExplanationLanguage = explanationSupported ? requestedContentLanguage : 'de';
  const firstDeadline = result.deadlines[0];
  const firstAction = result.actions[0];
  const pendingReviews = result.reviewRecords.filter((record) => record.decision === 'pending');
  const localized = localizedExplanationSections(result, contentLanguage);
  const fieldLabel = (field: string) => ({
    documentType: t('document.type'), subtype: t('document.subcategory'), purpose: t('intelligence.purpose'),
    sender: t('document.sender'), recipient: t('intelligence.recipient'), mainAmount: t('document.amount'),
    deadlines: t('document.deadline'), actions: t('common.tasks'), riskLevel: t('intelligence.risk'),
  }[field] ?? field);
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: result.reviewRequired ? colors.coral : colors.border },
      ]}
      testID="document-intelligence-panel"
    >
      <View style={styles.header}>
        <View style={[styles.headerIcon, { backgroundColor: colors.coralSoft }]}>
          <Feather name="cpu" size={16} color={colors.coral} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={[styles.title, { color: colors.navy }]}>{t('intelligence.title')}</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {t('common.documentLanguage')}: {isAppLanguage(result.documentLanguage.value) ? languageName(result.documentLanguage.value, language) : t('document.languageUnknown')} · {t('common.version')} {result.version}
          </Text>
        </View>
        <Text style={[styles.reviewBadge, { color: result.reviewRequired ? colors.coral : colors.sageDeep }]}>
          {result.reviewRequired ? t('intelligence.review') : t('intelligence.evidenced')}
        </Text>
      </View>

      {result.reviewRequired ? (
        <View style={[styles.reviewBox, { backgroundColor: colors.coralSoft }]}>
          <Text style={[styles.reviewTitle, { color: colors.coral }]}>{t('intelligence.humanReview')}</Text>
          <Text style={[styles.reviewText, { color: colors.navy }]}>
            {pendingReviews.length} {t('intelligence.pending')}
          </Text>
          {onReview ? (
            <Pressable onPress={onReview} style={[styles.reviewButton, { backgroundColor: colors.coral }]}>
              <Text style={[styles.reviewButtonText, { color: colors.white }]}>{t('intelligence.reviewFields')}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {!compact && pendingReviews.length && onReviewDecision ? (
        <View style={styles.reviewList} testID="document-intelligence-review-list">
          <Text style={[styles.sectionTitle, { color: colors.navy }]}>{t('intelligence.reviewFields')}</Text>
          {pendingReviews.map((record) => (
            <View key={record.field} style={[styles.reviewItem, { borderColor: colors.border }]}>
              <View style={styles.reviewItemHeader}>
                <Text style={[styles.reviewTitle, { color: colors.navy }]}>
                  {fieldLabel(record.field)}
                </Text>
                <Text style={[styles.confidence, { color: record.confidence === 'high' ? colors.sageDeep : colors.coral }]}>
                  {confidenceLabel(record.confidence, language)}
                </Text>
              </View>
              <Text style={[styles.reviewText, { color: colors.mutedForeground }]}>{record.reason}</Text>
              {record.evidence[0] ? (
                <Text style={[styles.evidence, { color: colors.mutedForeground }]}>
                  {t('intelligence.evidence')}: „{record.evidence[0].text}“
                </Text>
              ) : (
                <Text style={[styles.evidence, { color: colors.coral }]}>{t('action.noEvidence')}</Text>
              )}
              <View style={styles.reviewActions}>
                <Pressable
                  onPress={() => onReviewDecision(record.field, 'accept')}
                  style={[styles.reviewChoice, { backgroundColor: colors.sageDeep }]}
                >
                  <Text style={[styles.reviewChoiceText, { color: colors.white }]}>{t('common.accept')}</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    onReviewDecision(record.field, 'edit');
                    onReview?.();
                  }}
                  style={[styles.reviewChoice, { backgroundColor: colors.navy }]}
                >
                  <Text style={[styles.reviewChoiceText, { color: colors.white }]}>{t('common.edit')}</Text>
                </Pressable>
                <Pressable
                  onPress={() => onReviewDecision(record.field, 'reject')}
                  style={[styles.reviewChoice, { borderColor: colors.coral, borderWidth: 1 }]}
                >
                  <Text style={[styles.reviewChoiceText, { color: colors.coral }]}>{t('common.reject')}</Text>
                </Pressable>
                <Pressable
                  onPress={() => onReviewDecision(record.field, 'unknown')}
                  style={[styles.reviewChoice, { borderColor: colors.border, borderWidth: 1 }]}
                >
                  <Text style={[styles.reviewChoiceText, { color: colors.navy }]}>{t('common.unknown')}</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.summaryGrid}>
        <View style={[styles.summaryItem, { backgroundColor: colors.background }]}>
          <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>{t('document.title')}</Text>
          <Text style={[styles.summaryValue, { color: colors.navy }]}>{factText(result.taxonomy.subtype)}</Text>
        </View>
        <View style={[styles.summaryItem, { backgroundColor: colors.background }]}>
          <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>{t('intelligence.risk')}</Text>
          <Text style={[styles.summaryValue, { color: colors.navy }]}>
            {riskLabel(result.consequences.riskLevel.value, language)}
          </Text>
        </View>
      </View>

      {compact ? (
        explanationSupported ? (
          <>
            <Text style={[styles.compactText, { color: colors.navy }]}>{localized.action}</Text>
            <Text style={[styles.compactText, { color: colors.mutedForeground }]}>{localized.deadline}</Text>
          </>
        ) : (
          <Text style={[styles.compactText, { color: colors.coral }]}>{t('intelligence.explanationUnsupported')}</Text>
        )
      ) : (
        <>
          <Text style={[styles.sectionTitle, { color: colors.navy }]}>{t('intelligence.coreData')}</Text>
          <FactRow label={t('intelligence.purpose')} fact={result.taxonomy.purpose} />
          <FactRow label={t('document.sender')} fact={result.parties.sender} />
          <FactRow label={t('intelligence.recipient')} fact={result.parties.recipient} />
          <FactRow label={t('document.date')} fact={{ ...result.dates.documentDate, value: date(factText(result.dates.documentDate, t('common.uncertain'))) }} />
          <FactRow label={t('document.amount')} fact={{ ...result.amounts.main, value: currency(factText(result.amounts.main, t('common.uncertain'))) }} />

          <TextBlock label={t('intelligence.whatIsIt')} text={factText(result.taxonomy.subtype)} />
          {explanationSupported ? <>
            <TextBlock label={t('intelligence.whatItMeans')} text={explanationFor(result, contentLanguage, 'plain')} />
            <TextBlock label={t('intelligence.whatToDo')} text={localized.action} />
            <TextBlock label={t('intelligence.byWhen')} text={localized.deadline} />
            <TextBlock label={t('intelligence.howMuch')} text={localized.amount} />
          </> : <Text style={[styles.compactText, { color: colors.coral }]}>{t('intelligence.explanationUnsupported')}</Text>}
          <TextBlock
            label={t('intelligence.ifNoAction')}
            text={result.consequences.explicitItems[0]?.value ?? t('intelligence.noConsequence')}
          />
          <TextBlock
            label={t('intelligence.options')}
            text={
              [...result.rightsOptions, ...result.alternatives].map((item) => item.option).join(' · ') ||
              t('intelligence.noOption')
            }
          />

          {firstDeadline ? (
            <View style={[styles.insight, { backgroundColor: colors.sage }]}>
              <Text style={[styles.insightLabel, { color: colors.sageDeep }]}>{t('intelligence.nextDeadline')}</Text>
              <Text style={[styles.insightValue, { color: colors.sageDeep }]}>
                {deadlineKindLabel(firstDeadline.kind, language)}: {firstDeadline.value ?? firstDeadline.source}
              </Text>
              <Evidence fact={firstDeadline} />
            </View>
          ) : null}
          {firstAction ? (
            <View style={[styles.insight, { backgroundColor: colors.background }]}>
              <Text style={[styles.insightLabel, { color: colors.mutedForeground }]}>{t('intelligence.nextStep')}</Text>
              <Text style={[styles.insightValue, { color: colors.navy }]}>{firstAction.requirement}</Text>
              <Evidence fact={firstAction} />
            </View>
          ) : null}
          {result.consequences.items.length ? (
            <View style={[styles.warning, { backgroundColor: colors.coralSoft }]}>
              <Text style={[styles.insightLabel, { color: colors.coral }]}>{t('intelligence.warningConsequence')}</Text>
              <Text style={[styles.insightValue, { color: colors.navy }]}>{result.consequences.items[0].value}</Text>
            </View>
          ) : null}
          {result.keyPoints.length ? (
            <View style={[styles.insight, { backgroundColor: colors.background }]}>
              <Text style={[styles.insightLabel, { color: colors.mutedForeground }]}>{t('intelligence.mostImportant')}</Text>
              {result.keyPoints.slice(0, 5).map((point, index) => (
                <Text key={`${point.value}-${index}`} style={[styles.insightValue, { color: colors.navy }]}>
                  {index + 1}. {factText(point)}
                </Text>
              ))}
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 20, padding: 14, gap: 11 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1 },
  title: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  subtitle: { fontSize: 10, fontFamily: 'Inter_400Regular', marginTop: 3 },
  reviewBadge: { fontSize: 10, fontFamily: 'Inter_700Bold' },
  reviewBox: { borderRadius: 13, padding: 11, gap: 6 },
  reviewTitle: { fontSize: 11, fontFamily: 'Inter_700Bold' },
  reviewText: { fontSize: 11, lineHeight: 16, fontFamily: 'Inter_400Regular' },
  reviewButton: { alignSelf: 'flex-start', borderRadius: 10, paddingHorizontal: 11, paddingVertical: 8, marginTop: 2 },
  reviewButtonText: { fontSize: 10, fontFamily: 'Inter_700Bold' },
  reviewList: { gap: 8 },
  reviewItem: { borderWidth: 1, borderRadius: 13, padding: 10, gap: 5 },
  reviewItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  reviewChoice: { borderRadius: 9, paddingHorizontal: 9, paddingVertical: 7 },
  reviewChoiceText: { fontSize: 9, fontFamily: 'Inter_700Bold' },
  summaryGrid: { flexDirection: 'row', gap: 8 },
  summaryItem: { flex: 1, borderRadius: 12, padding: 10 },
  summaryLabel: { fontSize: 9, fontFamily: 'Inter_400Regular' },
  summaryValue: { fontSize: 12, fontFamily: 'Inter_700Bold', marginTop: 4 },
  sectionTitle: { fontSize: 12, fontFamily: 'Inter_700Bold', marginTop: 4 },
  factRow: { minHeight: 48, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 7, flexDirection: 'row', gap: 8 },
  factCopy: { flex: 1 },
  factLabel: { fontSize: 9, fontFamily: 'Inter_600SemiBold' },
  factValue: { fontSize: 12, fontFamily: 'Inter_500Medium', marginTop: 2 },
  evidence: { fontSize: 9, lineHeight: 13, fontFamily: 'Inter_400Regular', marginTop: 2 },
  confidence: { fontSize: 9, fontFamily: 'Inter_700Bold', paddingTop: 2 },
  insight: { borderRadius: 13, padding: 11, gap: 3 },
  insightLabel: { fontSize: 9, fontFamily: 'Inter_700Bold', textTransform: 'uppercase', letterSpacing: 0.5 },
  insightValue: { fontSize: 12, lineHeight: 17, fontFamily: 'Inter_500Medium' },
  warning: { borderRadius: 13, padding: 11, gap: 3 },
  compactText: { fontSize: 11, lineHeight: 16, fontFamily: 'Inter_400Regular' },
});