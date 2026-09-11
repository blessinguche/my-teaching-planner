import { fillDocxTemplate, safeDocName } from "./docxPlaceholders";
import type { LessonPlan, TraineeProgressRecord } from "./types";

const TEMPLATE_URL = "/templates/niot-tpr.docx";

function phase(
  plan: LessonPlan | null | undefined,
  name: LessonPlan["sequence"][number]["phase"],
) {
  const matches = plan?.sequence.filter((r) => r.phase === name) ?? [];
  if (matches.length === 0) return { time: "", teacher: "", learners: "" };
  const m = matches[0]!;
  return { time: m.time, teacher: m.teacher, learners: m.learners };
}

export async function exportTprDocx(
  record: TraineeProgressRecord,
  lesson: LessonPlan | null | undefined,
) {
  const entrance = phase(lesson, "entrance");
  const intro = phase(lesson, "introduction");
  const input = phase(lesson, "input");
  const checkpoint = phase(lesson, "checkpoint");
  const plenary = phase(lesson, "plenary");

  const values: Record<string, string> = {
    weekLabel: record.weekLabel,
    teacher: lesson?.teacher ?? "",
    date: lesson?.date || record.date,
    teachingGroup: lesson?.teachingGroup ?? "",
    title: lesson?.title ?? "",
    objectives: lesson?.objectives ?? "",
    review: lesson?.review ?? "",
    startingFrom: lesson?.startingFrom ?? "",
    endGoal: lesson?.endGoal ?? "",
    coreKnowledge: lesson?.coreKnowledge ?? "",
    checkpointCheck: lesson?.checkpointCheck ?? "",
    misconceptions: lesson?.misconceptions ?? "",
    findMisconceptions: lesson?.findMisconceptions ?? "",
    vocabulary: lesson?.vocabulary ?? "",
    environmentSupport: "",
    adultSupport: "",
    mentorFocus: lesson?.mentorFocus ?? "",
    entranceTime: entrance.time,
    entranceTeacher: entrance.teacher,
    entranceLearners: entrance.learners,
    introTime: intro.time,
    introTeacher: intro.teacher,
    introLearners: intro.learners,
    inputTime: input.time,
    inputTeacher: input.teacher,
    inputLearners: input.learners,
    checkpointTeacher: [
      checkpoint.time && `Time: ${checkpoint.time}`,
      checkpoint.teacher,
    ]
      .filter(Boolean)
      .join("\n"),
    checkpointLearners: checkpoint.learners,
    plenaryTime: plenary.time,
    plenaryTeacher: plenary.teacher,
    plenaryLearners: plenary.learners,
    formalLessonPlanReady: record.formalLessonPlanReady,
    strengthSC: record.strengthSC,
    strengthPT: record.strengthPT,
    strengthKYL: record.strengthKYL,
    strengthBR: record.strengthBR,
    strengthMC: record.strengthMC,
    strengthART: record.strengthART,
    strengthPB: record.strengthPB,
    strengthEC: record.strengthEC,
    keyDevelopmentPoints: record.keyDevelopmentPoints,
    weeklyReviewDrawingUpon: record.weeklyReviewDrawingUpon,
    weeklyReviewFurtherProgress: record.weeklyReviewFurtherProgress,
    wellbeingCheckDone: record.wellbeingCheckDone,
    centreActionMet: record.centreActionMet,
    centreActionEvidence: record.centreActionEvidence,
    mentorActionMet: record.mentorActionMet,
    mentorActionEvidence: record.mentorActionEvidence,
    notMetReasons: record.notMetReasons,
    daysAbsent: record.daysAbsent,
    absenceReasons: record.absenceReasons,
    absenceStart: record.absenceStart,
    absenceEnd: record.absenceEnd,
    absenceOther: record.absenceOther,
    trainingConversationNotes: record.trainingConversationNotes,
    centreActionStep1: record.centreActionStep1,
    centreActionStep2: record.centreActionStep2,
    mentorLedConversationDone: record.mentorLedConversationDone,
    curriculumTaskDone: record.curriculumTaskDone,
  };

  await fillDocxTemplate(
    TEMPLATE_URL,
    values,
    `${safeDocName(["TPR", record.weekLabel || "week", record.date])}.docx`,
  );
}
