/**
 * grammarData.ts
 *
 * English Tenses curriculum — frontend-only content.
 * 3 units (Present, Past, Future), each with lessons containing
 * context-based questions and AI-style explanations.
 *
 * DESIGN RULE: Every question MUST include a time clue or scenario context.
 * Never allow naked "She ___ to school" without context.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GrammarExplanation {
  whyCorrect: string;
  whyWrong?: string; // shown when user picks wrong answer
  rule: string;
  example: string;
}

export interface GrammarQuestion {
  id: string;
  /** The sentence with context. Must contain a time clue or scenario. */
  sentence: string;
  options: [string, string, string, string]; // exactly 4
  correctIndex: number; // 0-3
  explanation: GrammarExplanation;
  difficulty: "easy" | "medium" | "hard";
}

export interface GrammarLesson {
  id: string;
  title: string;
  subtitle: string;
  questions: GrammarQuestion[];
  /** Override for exercise count display when questions[] is not the source (e.g., drag-drop). */
  exerciseCount?: number;
}

export interface GrammarUnit {
  id: string;
  title: string;
  emoji: string;
  description: string;
  color: string; // tailwind-compatible color key
  lessons: GrammarLesson[];
  /** Mini exam: mixed questions from all lessons in this unit */
  examQuestions: GrammarQuestion[];
}

// ---------------------------------------------------------------------------
// Final Exam
// ---------------------------------------------------------------------------

export interface FinalExamConfig {
  title: string;
  timeLimitSeconds: number;
  passingScore: number; // 0-100
  xpReward: number;
}

export const FINAL_EXAM_CONFIG: FinalExamConfig = {
  title: "English Tenses Final Exam",
  timeLimitSeconds: 600, // 10 minutes
  passingScore: 70,
  xpReward: 50,
};

// ---------------------------------------------------------------------------
// Unit 1: Present Tenses
// ---------------------------------------------------------------------------

const PRESENT_UNIT: GrammarUnit = {
  id: "unit-present",
  title: "Present Tenses",
  emoji: "\u{1F31F}",
  description: "Master how to talk about habits, current actions, and recent events",
  color: "emerald",
  lessons: [
    {
      id: "present-simple-basics",
      title: "Simple Present: Daily Routines",
      subtitle: "Habits and things that are always true",
      questions: [
        {
          id: "ps-1",
          sentence: "Every morning, my sister ___ her teeth before breakfast.",
          options: ["brush", "brushes", "is brushing", "brushed"],
          correctIndex: 1,
          explanation: {
            whyCorrect: "\"Every morning\" signals a habitual action. With third-person singular (my sister), we add -es to \"brush.\"",
            whyWrong: "\"Brush\" lacks the -s/-es ending needed for he/she/it subjects in simple present.",
            rule: "Simple Present + he/she/it = verb + s/es. Used for habits and routines.",
            example: "He watches TV every evening after dinner.",
          },
          difficulty: "easy",
        },
        {
          id: "ps-2",
          sentence: "You're describing your daily life to a new friend. \"I ___ to work by bus every day.\"",
          options: ["go", "goes", "am going", "went"],
          correctIndex: 0,
          explanation: {
            whyCorrect: "\"Every day\" indicates a routine. With \"I\" as the subject, the base form \"go\" is correct.",
            rule: "Simple Present with I/you/we/they uses the base verb form for habits.",
            example: "We eat lunch at noon every day.",
          },
          difficulty: "easy",
        },
        {
          id: "ps-3",
          sentence: "Your teacher asks about general facts. \"Water ___ at 100 degrees Celsius.\"",
          options: ["boil", "boils", "is boiling", "boiled"],
          correctIndex: 1,
          explanation: {
            whyCorrect: "This is a scientific fact that is always true. Simple present is used for permanent truths.",
            rule: "Simple Present is used for general truths and scientific facts.",
            example: "The sun rises in the east.",
          },
          difficulty: "easy",
        },
        {
          id: "ps-4",
          sentence: "On weekends, they usually ___ football in the park near their house.",
          options: ["plays", "play", "are playing", "played"],
          correctIndex: 1,
          explanation: {
            whyCorrect: "\"On weekends\" + \"usually\" = habitual action. \"They\" takes the base form \"play.\"",
            rule: "Frequency adverbs (usually, always, often) signal simple present tense.",
            example: "She always drinks coffee in the morning.",
          },
          difficulty: "easy",
        },
        {
          id: "ps-5",
          sentence: "Your classmate asks about your father's job. \"My father ___ at a hospital. He's a doctor.\"",
          options: ["work", "works", "is working", "worked"],
          correctIndex: 1,
          explanation: {
            whyCorrect: "Describing someone's permanent job uses simple present. \"My father\" = third person singular.",
            rule: "Simple Present describes permanent situations and occupations.",
            example: "She teaches English at a university.",
          },
          difficulty: "medium",
        },
      ],
    },
    {
      id: "present-continuous-now",
      title: "Present Continuous: Right Now",
      subtitle: "Actions happening at this moment",
      questions: [
        {
          id: "pc-1",
          sentence: "Look! The children ___ in the garden right now.",
          options: ["play", "plays", "are playing", "played"],
          correctIndex: 2,
          explanation: {
            whyCorrect: "\"Look!\" and \"right now\" signal an action happening at this exact moment. Present continuous: am/is/are + verb-ing.",
            rule: "Present Continuous (am/is/are + -ing) describes actions happening right now.",
            example: "Listen! Someone is knocking on the door.",
          },
          difficulty: "easy",
        },
        {
          id: "pc-2",
          sentence: "You call your friend at 8 PM. She says: \"Sorry, I can't talk. I ___ dinner right now.\"",
          options: ["cook", "cooks", "am cooking", "cooked"],
          correctIndex: 2,
          explanation: {
            whyCorrect: "\"Right now\" + a temporary action in progress = present continuous with \"I\" = \"am cooking.\"",
            rule: "Use \"am + verb-ing\" with I, \"is\" with he/she/it, \"are\" with you/we/they.",
            example: "I am studying for my exam right now.",
          },
          difficulty: "easy",
        },
        {
          id: "pc-3",
          sentence: "At this moment, the teacher ___ something on the whiteboard.",
          options: ["writes", "write", "is writing", "wrote"],
          correctIndex: 2,
          explanation: {
            whyCorrect: "\"At this moment\" clearly indicates an action in progress. \"The teacher\" = he/she = is + writing.",
            rule: "Time markers like \"at this moment,\" \"now,\" \"currently\" require present continuous.",
            example: "Currently, she is reading a novel.",
          },
          difficulty: "easy",
        },
        {
          id: "pc-4",
          sentence: "You're on a video call showing your room. \"As you can see, my cat ___ on the sofa.\"",
          options: ["sleeps", "sleep", "is sleeping", "slept"],
          correctIndex: 2,
          explanation: {
            whyCorrect: "You're describing what is visibly happening right now. Present continuous captures this temporary, observable action.",
            rule: "Present Continuous describes temporary situations and actions visible right now.",
            example: "Look, it is raining outside!",
          },
          difficulty: "medium",
        },
        {
          id: "pc-5",
          sentence: "This week, I ___ a new programming language for my project at work.",
          options: ["learn", "learns", "am learning", "learned"],
          correctIndex: 2,
          explanation: {
            whyCorrect: "\"This week\" indicates a temporary action around now (not necessarily this exact second). Present continuous is used for temporary situations.",
            rule: "Present Continuous also describes temporary actions happening \"around now\" (this week, these days, this month).",
            example: "These days, she is working from home.",
          },
          difficulty: "medium",
        },
      ],
    },
    {
      id: "present-perfect-experience",
      title: "Present Perfect: Life Experiences",
      subtitle: "Connecting the past to now",
      questions: [
        {
          id: "pp-1",
          sentence: "You're talking about travel experiences with friends. \"I ___ to Japan three times.\"",
          options: ["go", "went", "have been", "am going"],
          correctIndex: 2,
          explanation: {
            whyCorrect: "Talking about life experiences (without a specific past time) uses present perfect. \"Have been\" = experience up to now.",
            rule: "Present Perfect (have/has + past participle) describes experiences in your life up to now.",
            example: "She has visited Paris twice.",
          },
          difficulty: "medium",
        },
        {
          id: "pp-2",
          sentence: "Your friend offers you lunch but you're not hungry. \"No thanks, I ___ already ___ lunch.\"",
          options: ["have ... eaten", "had ... eaten", "am ... eating", "did ... eat"],
          correctIndex: 0,
          explanation: {
            whyCorrect: "\"Already\" with a result that affects now (you're not hungry) = present perfect.",
            rule: "Use Present Perfect with \"already,\" \"just,\" \"yet\" for recent actions with present relevance.",
            example: "I have just finished my homework.",
          },
          difficulty: "medium",
        },
        {
          id: "pp-3",
          sentence: "A job interviewer asks about your experience. \"___ you ever ___ in a team before?\"",
          options: ["Have ... worked", "Did ... work", "Are ... working", "Do ... work"],
          correctIndex: 0,
          explanation: {
            whyCorrect: "\"Ever\" + asking about general life experience = present perfect. The time is unspecified.",
            rule: "\"Have you ever + past participle?\" asks about life experiences at any point up to now.",
            example: "Have you ever tried Vietnamese food?",
          },
          difficulty: "medium",
        },
        {
          id: "pp-4",
          sentence: "Your sister looks upset. You ask: \"What's wrong?\" She says: \"I ___ my phone. I can't find it anywhere.\"",
          options: ["lose", "lost", "have lost", "am losing"],
          correctIndex: 2,
          explanation: {
            whyCorrect: "The past action (losing the phone) has a present result (can't find it now). This connection = present perfect.",
            rule: "Present Perfect links a past action to its present result or consequence.",
            example: "He has broken his leg, so he can't play football.",
          },
          difficulty: "hard",
        },
        {
          id: "pp-5",
          sentence: "You're catching up with an old classmate. \"I ___ here since 2020. I love this city.\"",
          options: ["live", "lived", "have lived", "am living"],
          correctIndex: 2,
          explanation: {
            whyCorrect: "\"Since 2020\" = starting in the past and continuing to now. Present perfect with \"since\" or \"for\" shows duration.",
            rule: "Present Perfect + \"since\" (point in time) or \"for\" (duration) = action that started in the past and continues now.",
            example: "They have known each other for ten years.",
          },
          difficulty: "hard",
        },
      ],
    },
    {
      id: "present-mixed",
      title: "Present Tenses: Mixed Practice",
      subtitle: "Choose the right present tense",
      questions: [
        {
          id: "pm-1",
          sentence: "Right now, she ___ her homework, but usually she ___ it after dinner.",
          options: [
            "is doing / does",
            "does / is doing",
            "do / does",
            "is doing / is doing",
          ],
          correctIndex: 0,
          explanation: {
            whyCorrect: "\"Right now\" = present continuous. \"Usually\" = simple present. Two different time contexts in one sentence.",
            rule: "Right now/at this moment = continuous. Always/usually/every day = simple present.",
            example: "He is watching TV now, but he usually reads books in the evening.",
          },
          difficulty: "hard",
        },
        {
          id: "pm-2",
          sentence: "Your colleague asks why you look tired. \"I ___ well recently. I think I need to see a doctor.\"",
          options: ["don't sleep", "am not sleeping", "haven't been sleeping", "didn't sleep"],
          correctIndex: 2,
          explanation: {
            whyCorrect: "\"Recently\" + ongoing situation with a present result (looking tired) = present perfect continuous.",
            rule: "Present Perfect Continuous (have been + -ing) emphasizes the duration of a recent ongoing action.",
            example: "She has been studying all day. That's why she's exhausted.",
          },
          difficulty: "hard",
        },
        {
          id: "pm-3",
          sentence: "A tourist asks you for directions. \"Excuse me, ___ you ___ where the nearest station is?\"",
          options: ["do ... know", "are ... knowing", "have ... known", "did ... know"],
          correctIndex: 0,
          explanation: {
            whyCorrect: "\"Know\" is a stative verb — it describes a state, not an action. Stative verbs use simple present, never continuous.",
            rule: "Stative verbs (know, believe, want, love, need) cannot use continuous form.",
            example: "I understand the question. (NOT: I am understanding)",
          },
          difficulty: "hard",
        },
        {
          id: "pm-4",
          sentence: "You're introducing yourself at a party. \"I ___ as a designer, but this month I ___ on a special photography project.\"",
          options: [
            "work / am working",
            "am working / work",
            "work / work",
            "am working / am working",
          ],
          correctIndex: 0,
          explanation: {
            whyCorrect: "Permanent job = simple present. \"This month\" = temporary situation = present continuous.",
            rule: "Permanent situations use simple present. Temporary situations use present continuous.",
            example: "She lives in London, but this summer she is staying in Paris.",
          },
          difficulty: "hard",
        },
        {
          id: "pm-5",
          sentence: "You see your neighbor carrying groceries. \"It looks like you ___ a lot of shopping today!\"",
          options: ["do", "are doing", "have done", "did"],
          correctIndex: 2,
          explanation: {
            whyCorrect: "The shopping is finished (carrying groceries = result). Present perfect describes the completed action with a visible present result.",
            rule: "When you can see the RESULT of a recently completed action, use present perfect.",
            example: "You've painted the room! It looks great.",
          },
          difficulty: "hard",
        },
      ],
    },
  ],
  examQuestions: [
    {
      id: "pe-1",
      sentence: "Every Friday, our team ___ a meeting to discuss the week's progress.",
      options: ["has", "have", "is having", "had"],
      correctIndex: 0,
      explanation: {
        whyCorrect: "\"Every Friday\" = habitual action. \"Our team\" = singular subject = \"has.\"",
        rule: "Simple Present for regular/scheduled events. Collective nouns (team, family) take singular verb.",
        example: "The class starts at 9 AM every Monday.",
      },
      difficulty: "medium",
    },
    {
      id: "pe-2",
      sentence: "Shhh! The baby ___ . Please don't make noise.",
      options: ["sleeps", "sleep", "is sleeping", "has slept"],
      correctIndex: 2,
      explanation: {
        whyCorrect: "\"Shhh!\" and \"please don't make noise\" indicate an action happening right now.",
        rule: "Present Continuous for actions in progress at the moment of speaking.",
        example: "Be quiet! The students are taking a test.",
      },
      difficulty: "easy",
    },
    {
      id: "pe-3",
      sentence: "You're at a reunion. \"I ___ at this company for five years now. Time flies!\"",
      options: ["work", "am working", "have worked", "worked"],
      correctIndex: 2,
      explanation: {
        whyCorrect: "\"For five years\" + \"now\" = started in the past, continues to the present = present perfect.",
        rule: "Present Perfect + for/since = duration from past to present.",
        example: "She has lived in this city since 2018.",
      },
      difficulty: "medium",
    },
    {
      id: "pe-4",
      sentence: "Look at the sky! It ___ darker. I think it's going to rain.",
      options: ["gets", "got", "is getting", "has gotten"],
      correctIndex: 2,
      explanation: {
        whyCorrect: "\"Look!\" = observable change happening now. Present continuous for changing/developing situations.",
        rule: "Present Continuous describes situations that are changing or developing now.",
        example: "The weather is getting colder these days.",
      },
      difficulty: "medium",
    },
    {
      id: "pe-5",
      sentence: "She ___ three languages fluently: Vietnamese, English, and French.",
      options: ["speaks", "is speaking", "has spoken", "spoke"],
      correctIndex: 0,
      explanation: {
        whyCorrect: "Knowing/speaking languages is a permanent ability. Simple present for permanent states.",
        rule: "Simple Present for permanent abilities, states, and characteristics.",
        example: "He plays the piano very well.",
      },
      difficulty: "easy",
    },
    {
      id: "pe-6",
      sentence: "Your friend comes in soaking wet. You say: \"You're all wet! ___ it ___ outside?\"",
      options: ["Does ... rain", "Is ... raining", "Has ... rained", "Did ... rain"],
      correctIndex: 1,
      explanation: {
        whyCorrect: "You're asking about what's happening right now (is it still raining?). Present continuous.",
        rule: "Use Present Continuous to ask about current situations when you see evidence.",
        example: "Is someone cooking? I can smell something delicious!",
      },
      difficulty: "medium",
    },
  ],
};

// ---------------------------------------------------------------------------
// Unit 2: Past Tenses
// ---------------------------------------------------------------------------

const PAST_UNIT: GrammarUnit = {
  id: "unit-past",
  title: "Past Tenses",
  emoji: "\u{23F3}",
  description: "Tell stories, describe memories, and explain what happened",
  color: "blue",
  lessons: [
    {
      id: "past-simple-events",
      title: "Simple Past: Completed Events",
      subtitle: "Things that happened and finished",
      questions: [
        {
          id: "pst-1",
          sentence: "Yesterday, I ___ to the market and bought some vegetables for dinner.",
          options: ["go", "goes", "went", "have gone"],
          correctIndex: 2,
          explanation: {
            whyCorrect: "\"Yesterday\" = specific past time. Simple past for completed actions at a definite time in the past.",
            rule: "Simple Past (verb-ed or irregular form) for completed actions at a specific past time.",
            example: "Last week, we visited our grandparents.",
          },
          difficulty: "easy",
        },
        {
          id: "pst-2",
          sentence: "You're telling a friend about your weekend. \"On Saturday, we ___ a movie at the cinema. It was really good!\"",
          options: ["watch", "watched", "were watching", "have watched"],
          correctIndex: 1,
          explanation: {
            whyCorrect: "\"On Saturday\" = specific past time. Telling a story about a completed event = simple past.",
            rule: "Time expressions like \"yesterday,\" \"last week,\" \"on Monday,\" \"in 2020\" signal simple past.",
            example: "She finished university in 2019.",
          },
          difficulty: "easy",
        },
        {
          id: "pst-3",
          sentence: "When I was a child, my grandmother ___ me stories before bedtime every night.",
          options: ["tells", "told", "was telling", "has told"],
          correctIndex: 1,
          explanation: {
            whyCorrect: "\"When I was a child\" sets a past time frame. \"Every night\" here describes a past habit = simple past.",
            rule: "Simple Past also describes past habits and repeated actions (used to do / did regularly).",
            example: "When I was young, I played outside every afternoon.",
          },
          difficulty: "medium",
        },
        {
          id: "pst-4",
          sentence: "Your teacher asks what happened. \"The power ___ off during the exam, so we had to stop.\"",
          options: ["goes", "went", "was going", "has gone"],
          correctIndex: 1,
          explanation: {
            whyCorrect: "A sudden, completed event in the past. \"Went off\" describes the moment it happened.",
            rule: "Simple Past for sudden, completed events in a past narrative.",
            example: "The phone rang, and he picked it up immediately.",
          },
          difficulty: "medium",
        },
        {
          id: "pst-5",
          sentence: "Last summer, they ___ to Danang and ___ three days at the beach.",
          options: [
            "traveled / spent",
            "travel / spend",
            "were traveling / were spending",
            "have traveled / have spent",
          ],
          correctIndex: 0,
          explanation: {
            whyCorrect: "\"Last summer\" = definite past time. Two sequential completed actions, both in simple past.",
            rule: "When listing past events in sequence, use simple past for each action.",
            example: "She woke up, got dressed, and left for work.",
          },
          difficulty: "medium",
        },
      ],
    },
    {
      id: "past-continuous-background",
      title: "Past Continuous: Background Actions",
      subtitle: "What was happening when something else occurred",
      questions: [
        {
          id: "pcont-1",
          sentence: "I ___ TV when the earthquake suddenly started last night.",
          options: ["watch", "watched", "was watching", "have watched"],
          correctIndex: 2,
          explanation: {
            whyCorrect: "\"Was watching\" = ongoing background action. \"Started\" = sudden interruption. Past continuous + simple past.",
            rule: "Past Continuous (was/were + -ing) for an action in progress when another event interrupted it.",
            example: "She was reading a book when the phone rang.",
          },
          difficulty: "easy",
        },
        {
          id: "pcont-2",
          sentence: "At 7 PM last night, the children ___ their homework in the living room.",
          options: ["do", "did", "were doing", "have done"],
          correctIndex: 2,
          explanation: {
            whyCorrect: "\"At 7 PM last night\" = a specific moment in the past. The action was in progress at that moment.",
            rule: "Past Continuous describes what was happening at a specific point in time in the past.",
            example: "At midnight, everyone was still dancing at the party.",
          },
          difficulty: "easy",
        },
        {
          id: "pcont-3",
          sentence: "While my mom ___ dinner, my dad ___ the table. They were preparing for guests.",
          options: [
            "cooked / set",
            "was cooking / was setting",
            "cooks / sets",
            "had cooked / had set",
          ],
          correctIndex: 1,
          explanation: {
            whyCorrect: "\"While\" + two simultaneous ongoing past actions = both in past continuous.",
            rule: "Use Past Continuous for two (or more) actions happening at the same time in the past.",
            example: "While he was studying, she was watching TV.",
          },
          difficulty: "medium",
        },
        {
          id: "pcont-4",
          sentence: "You're explaining why you missed the bus. \"I ___ on the phone, so I didn't notice the bus arriving.\"",
          options: ["talk", "talked", "was talking", "have talked"],
          correctIndex: 2,
          explanation: {
            whyCorrect: "The phone call was the ongoing background action that caused you to miss the bus.",
            rule: "Past Continuous provides background context or reason for another past event.",
            example: "I was sleeping, so I didn't hear the doorbell.",
          },
          difficulty: "medium",
        },
        {
          id: "pcont-5",
          sentence: "It ___ heavily all morning yesterday, so the school decided to cancel outdoor activities.",
          options: ["rains", "rained", "was raining", "has rained"],
          correctIndex: 2,
          explanation: {
            whyCorrect: "\"All morning yesterday\" = extended duration in the past. The rain was ongoing throughout that period.",
            rule: "Past Continuous for extended actions over a period in the past.",
            example: "They were traveling around Europe all last summer.",
          },
          difficulty: "medium",
        },
      ],
    },
    {
      id: "past-perfect-before",
      title: "Past Perfect: Earlier Events",
      subtitle: "Something that happened before another past event",
      questions: [
        {
          id: "ppf-1",
          sentence: "When we arrived at the cinema yesterday, the movie ___ already ___.",
          options: ["has ... started", "had ... started", "was ... starting", "did ... start"],
          correctIndex: 1,
          explanation: {
            whyCorrect: "The movie started BEFORE we arrived. Two past events: the earlier one uses past perfect.",
            rule: "Past Perfect (had + past participle) for an action that happened before another past action.",
            example: "She had left before I got to the party.",
          },
          difficulty: "medium",
        },
        {
          id: "ppf-2",
          sentence: "You're telling a story. \"I was nervous because I ___ never ___ on a plane before that trip.\"",
          options: ["have ... flown", "had ... flown", "was ... flying", "did ... fly"],
          correctIndex: 1,
          explanation: {
            whyCorrect: "\"Never ... before that trip\" = experience up to a past point. Past perfect for experiences before a past reference point.",
            rule: "Past Perfect with \"never\" describes lack of experience up to a specific past moment.",
            example: "He had never seen snow before he moved to Canada.",
          },
          difficulty: "medium",
        },
        {
          id: "ppf-3",
          sentence: "By the time the teacher came to class last Monday, the students ___ all the homework.",
          options: ["finish", "finished", "had finished", "were finishing"],
          correctIndex: 2,
          explanation: {
            whyCorrect: "\"By the time\" signals that one event was completed before another past event. The finishing happened first.",
            rule: "\"By the time\" + past simple in the main clause = past perfect in the subordinate clause.",
            example: "By the time he called, she had already gone to sleep.",
          },
          difficulty: "hard",
        },
        {
          id: "ppf-4",
          sentence: "Your friend asks why you weren't hungry at the party last night. \"I ___ a big meal just before I came.\"",
          options: ["eat", "ate", "had eaten", "was eating"],
          correctIndex: 2,
          explanation: {
            whyCorrect: "Eating happened BEFORE coming to the party (both past). The earlier action uses past perfect.",
            rule: "Past Perfect explains WHY something was the case at a past moment.",
            example: "She was tired because she had worked all day.",
          },
          difficulty: "hard",
        },
        {
          id: "ppf-5",
          sentence: "After she ___ the report, she emailed it to her manager and went home.",
          options: ["finishes", "finished", "had finished", "was finishing"],
          correctIndex: 2,
          explanation: {
            whyCorrect: "\"After\" + completing the report happened before emailing and going home. Past perfect for the first action in the sequence.",
            rule: "After/before/when connecting two past events: the earlier event uses past perfect.",
            example: "After they had eaten, they went for a walk.",
          },
          difficulty: "hard",
        },
      ],
    },
    {
      id: "past-mixed",
      title: "Past Tenses: Mixed Practice",
      subtitle: "Choose the right past tense",
      questions: [
        {
          id: "pastm-1",
          sentence: "When I ___ home last night, my roommate ___ dinner. The kitchen smelled amazing.",
          options: [
            "got / was cooking",
            "was getting / cooked",
            "got / cooked",
            "had got / was cooking",
          ],
          correctIndex: 0,
          explanation: {
            whyCorrect: "\"Got home\" = sudden arrival (simple past). \"Was cooking\" = ongoing action interrupted by the arrival (past continuous).",
            rule: "Simple Past (short action) + Past Continuous (background action already in progress).",
            example: "When she called, I was having lunch.",
          },
          difficulty: "hard",
        },
        {
          id: "pastm-2",
          sentence: "You explain a situation at work. \"The client ___ angry because we ___ the deadline the week before.\"",
          options: [
            "was / missed",
            "was / had missed",
            "had been / missed",
            "is / missed",
          ],
          correctIndex: 1,
          explanation: {
            whyCorrect: "The client was angry (past state) because of an earlier event (missing the deadline). Earlier past = past perfect.",
            rule: "Past Perfect explains the cause; Simple Past describes the result.",
            example: "He was sad because his team had lost the match.",
          },
          difficulty: "hard",
        },
        {
          id: "pastm-3",
          sentence: "While we ___ in the park yesterday afternoon, it suddenly ___ to rain.",
          options: [
            "walked / started",
            "were walking / started",
            "walked / was starting",
            "had walked / started",
          ],
          correctIndex: 1,
          explanation: {
            whyCorrect: "\"While\" + ongoing action = past continuous. \"Suddenly\" + interruption = simple past.",
            rule: "While + past continuous, ... simple past = ongoing action interrupted by sudden event.",
            example: "While I was crossing the road, a car honked loudly.",
          },
          difficulty: "hard",
        },
        {
          id: "pastm-4",
          sentence: "Last year, I ___ Vietnamese food for the first time. I ___ never ___ it before.",
          options: [
            "tried / had ... tried",
            "try / have ... tried",
            "was trying / had ... tried",
            "tried / have ... tried",
          ],
          correctIndex: 0,
          explanation: {
            whyCorrect: "\"Last year\" + specific event = simple past. \"Never before\" = experience before that past moment = past perfect.",
            rule: "First time doing something: simple past for the event, past perfect for the lack of prior experience.",
            example: "She visited Japan last month. She had never been to Asia before.",
          },
          difficulty: "hard",
        },
        {
          id: "pastm-5",
          sentence: "At 10 PM last night, some people ___ , others ___ , and a few ___ already ___ to bed.",
          options: [
            "studied / watched TV / had ... gone",
            "were studying / were watching TV / had ... gone",
            "studied / were watching TV / went",
            "were studying / watched TV / went",
          ],
          correctIndex: 1,
          explanation: {
            whyCorrect: "\"At 10 PM\" = snapshot of multiple simultaneous ongoing actions (past continuous) + one already completed (past perfect).",
            rule: "Past Continuous for simultaneous actions at a past moment. Past Perfect for actions already completed by that moment.",
            example: "When I arrived, they were eating, and one person had already left.",
          },
          difficulty: "hard",
        },
      ],
    },
  ],
  examQuestions: [
    {
      id: "pste-1",
      sentence: "Last weekend, she ___ a beautiful dress at the market near her house.",
      options: ["buys", "bought", "was buying", "has bought"],
      correctIndex: 1,
      explanation: {
        whyCorrect: "\"Last weekend\" = specific past time. Completed purchase = simple past.",
        rule: "Simple Past for completed actions at a definite past time.",
        example: "He sold his old car last month.",
      },
      difficulty: "easy",
    },
    {
      id: "pste-2",
      sentence: "At 3 PM yesterday, I ___ in the library because I had an exam the next day.",
      options: ["study", "studied", "was studying", "had studied"],
      correctIndex: 2,
      explanation: {
        whyCorrect: "\"At 3 PM yesterday\" = specific moment. The action was in progress at that moment.",
        rule: "Past Continuous for actions in progress at a specific past moment.",
        example: "At noon yesterday, they were having lunch.",
      },
      difficulty: "easy",
    },
    {
      id: "pste-3",
      sentence: "When we arrived at the airport last Tuesday, the plane ___ already ___ .",
      options: ["has ... left", "had ... left", "was ... leaving", "did ... leave"],
      correctIndex: 1,
      explanation: {
        whyCorrect: "The plane departed before we arrived. Earlier past event = past perfect.",
        rule: "Past Perfect for the earlier of two past events.",
        example: "By the time I woke up, my parents had already left.",
      },
      difficulty: "medium",
    },
    {
      id: "pste-4",
      sentence: "While the students ___ for the exam, the fire alarm went off unexpectedly.",
      options: ["prepared", "were preparing", "had prepared", "prepare"],
      correctIndex: 1,
      explanation: {
        whyCorrect: "\"While\" = ongoing background action (past continuous). Fire alarm = sudden interruption (simple past).",
        rule: "While + past continuous for ongoing action; simple past for the interruption.",
        example: "While we were having dinner, the power went out.",
      },
      difficulty: "medium",
    },
    {
      id: "pste-5",
      sentence: "She ___ nervous about the presentation because she ___ never ___ in front of such a large audience before.",
      options: [
        "was / had ... spoken",
        "is / has ... spoken",
        "was / was ... speaking",
        "had been / spoke",
      ],
      correctIndex: 0,
      explanation: {
        whyCorrect: "\"Was nervous\" = past state. \"Never before\" = experience before that past point = past perfect.",
        rule: "Past Perfect with \"never\" for lack of experience before a past reference point.",
        example: "He was confused because he had never used that software before.",
      },
      difficulty: "hard",
    },
    {
      id: "pste-6",
      sentence: "I ___ asleep while I ___ a documentary about space exploration last night.",
      options: [
        "fell / was watching",
        "was falling / watched",
        "fell / watched",
        "had fallen / was watching",
      ],
      correctIndex: 0,
      explanation: {
        whyCorrect: "\"Fell asleep\" = sudden event. \"Was watching\" = ongoing background action. Classic interrupted action pattern.",
        rule: "Simple Past for the interrupting event + Past Continuous for the background action.",
        example: "The doorbell rang while she was taking a shower.",
      },
      difficulty: "medium",
    },
  ],
};

// ---------------------------------------------------------------------------
// Unit 3: Future Tenses
// ---------------------------------------------------------------------------

const FUTURE_UNIT: GrammarUnit = {
  id: "unit-future",
  title: "Future Tenses",
  emoji: "\u{1F680}",
  description: "Talk about plans, predictions, and what will happen next",
  color: "violet",
  lessons: [
    {
      id: "future-will-predictions",
      title: "Will: Predictions & Decisions",
      subtitle: "Spontaneous decisions and predictions",
      questions: [
        {
          id: "fw-1",
          sentence: "The phone is ringing. \"Don't worry, I ___ it!\"",
          options: ["answer", "am answering", "will answer", "am going to answer"],
          correctIndex: 2,
          explanation: {
            whyCorrect: "This is a spontaneous decision made at the moment of speaking. \"Will\" is used for instant decisions.",
            rule: "\"Will\" for spontaneous decisions made at the moment of speaking.",
            example: "\"It's cold in here.\" \"I'll close the window.\"",
          },
          difficulty: "easy",
        },
        {
          id: "fw-2",
          sentence: "Looking at the dark clouds, I think it ___ later this afternoon.",
          options: ["rains", "is raining", "will rain", "rained"],
          correctIndex: 2,
          explanation: {
            whyCorrect: "\"I think\" + prediction about the future based on opinion = \"will.\"",
            rule: "\"Will\" for predictions based on opinion or belief (I think, I believe, probably).",
            example: "I think she will pass the exam. She's been studying hard.",
          },
          difficulty: "easy",
        },
        {
          id: "fw-3",
          sentence: "Your friend asks about your weekend plans. You haven't decided yet. \"I don't know. Maybe I ___ at home.\"",
          options: ["stay", "am staying", "will stay", "stayed"],
          correctIndex: 2,
          explanation: {
            whyCorrect: "\"Maybe\" + uncertain future = \"will.\" No prior plan or arrangement exists.",
            rule: "\"Will\" for uncertain future predictions and unplanned possibilities.",
            example: "Maybe I'll go to the gym tomorrow. I'm not sure yet.",
          },
          difficulty: "easy",
        },
        {
          id: "fw-4",
          sentence: "A waiter asks what you'd like. You decide right then: \"I ___ the grilled chicken, please.\"",
          options: ["have", "am having", "will have", "had"],
          correctIndex: 2,
          explanation: {
            whyCorrect: "Ordering food on the spot = spontaneous decision at the moment of speaking.",
            rule: "\"I'll have...\" is the standard way to order in English (spontaneous choice).",
            example: "\"I'll have a coffee, please.\" \"And I'll take the pasta.\"",
          },
          difficulty: "easy",
        },
        {
          id: "fw-5",
          sentence: "Your teacher says: \"Study hard, and you ___ good results in the final exam next month.\"",
          options: ["get", "are getting", "will get", "got"],
          correctIndex: 2,
          explanation: {
            whyCorrect: "Conditional prediction: if you study → you will get results. \"Will\" for predicted outcomes.",
            rule: "\"Will\" in conditional predictions: if/when + present, ... will + base verb.",
            example: "If you practice every day, you will improve your English.",
          },
          difficulty: "medium",
        },
      ],
    },
    {
      id: "future-going-to-plans",
      title: "Going To: Plans & Evidence",
      subtitle: "Planned intentions and evidence-based predictions",
      questions: [
        {
          id: "fg-1",
          sentence: "You're telling friends about your vacation. \"Next month, I ___ visit my cousins in Ho Chi Minh City. I already booked the flight.\"",
          options: ["will", "am going to", "am", "would"],
          correctIndex: 1,
          explanation: {
            whyCorrect: "\"Already booked the flight\" = a pre-made plan. \"Going to\" for intentions decided before the moment of speaking.",
            rule: "\"Going to\" for plans and intentions decided BEFORE the moment of speaking.",
            example: "We're going to move to a new apartment next month. We've already signed the lease.",
          },
          difficulty: "easy",
        },
        {
          id: "fg-2",
          sentence: "Look at that car! It's going too fast. It ___ crash!",
          options: ["will", "is going to", "is", "would"],
          correctIndex: 1,
          explanation: {
            whyCorrect: "There is visible evidence right now (car going too fast) that leads to this prediction. \"Going to\" for evidence-based predictions.",
            rule: "\"Going to\" for predictions based on present evidence (something you can see/hear now).",
            example: "Look at those clouds! It's going to rain.",
          },
          difficulty: "easy",
        },
        {
          id: "fg-3",
          sentence: "Your colleague shares their goal. \"I ___ learn Japanese this year. I've already enrolled in a class.\"",
          options: ["will", "am going to", "learn", "learned"],
          correctIndex: 1,
          explanation: {
            whyCorrect: "\"Already enrolled\" = prior plan and preparation. \"Going to\" for planned intentions with evidence of preparation.",
            rule: "\"Going to\" when there is evidence of planning or preparation for a future action.",
            example: "She's going to start a new business. She's been saving money for months.",
          },
          difficulty: "medium",
        },
        {
          id: "fg-4",
          sentence: "The sky is perfectly clear this morning. It ___ be a beautiful day today.",
          options: ["will", "is going to", "is", "was going to"],
          correctIndex: 1,
          explanation: {
            whyCorrect: "Clear sky = visible evidence right now. Prediction based on current evidence = \"going to.\"",
            rule: "See/hear evidence now → prediction with \"going to.\" Opinion/belief → prediction with \"will.\"",
            example: "She's been coughing all day. She's going to get sick.",
          },
          difficulty: "medium",
        },
        {
          id: "fg-5",
          sentence: "You ask about dinner plans. Your partner says: \"I ___ make pasta tonight. I bought all the ingredients this morning.\"",
          options: ["will", "am going to", "make", "made"],
          correctIndex: 1,
          explanation: {
            whyCorrect: "\"Bought all the ingredients\" = prior preparation. This was planned before the moment of speaking.",
            rule: "Evidence of prior decision or preparation = \"going to,\" not \"will.\"",
            example: "We're going to paint the house this weekend. We've already bought the paint.",
          },
          difficulty: "medium",
        },
      ],
    },
    {
      id: "future-continuous-scheduled",
      title: "Future Continuous & Arrangements",
      subtitle: "Actions in progress at a future time",
      questions: [
        {
          id: "fc-1",
          sentence: "This time tomorrow, I ___ on the beach in Nha Trang!",
          options: ["sit", "will sit", "will be sitting", "am sitting"],
          correctIndex: 2,
          explanation: {
            whyCorrect: "\"This time tomorrow\" = a specific point in the future. The action will be in progress at that moment = future continuous.",
            rule: "Future Continuous (will be + -ing) for actions in progress at a specific future time.",
            example: "At 8 PM tonight, I will be watching the football match.",
          },
          difficulty: "medium",
        },
        {
          id: "fc-2",
          sentence: "Don't call me between 2 and 4 PM tomorrow. I ___ an important meeting with my boss.",
          options: ["have", "will have", "will be having", "had"],
          correctIndex: 2,
          explanation: {
            whyCorrect: "The meeting will be in progress during that time window. Future continuous for ongoing future actions.",
            rule: "Future Continuous for actions that will be in progress over a period of future time.",
            example: "From 9 to 11 AM, we will be taking our final exam.",
          },
          difficulty: "medium",
        },
        {
          id: "fc-3",
          sentence: "You're confirming plans with a colleague. \"I ___ you at the airport at 6 AM. I've already set my alarm.\"",
          options: ["meet", "will meet", "am meeting", "will be meeting"],
          correctIndex: 2,
          explanation: {
            whyCorrect: "\"Already set my alarm\" = fixed personal arrangement. Present continuous can express future arrangements, but here \"am meeting\" is also valid. The context of a confirmed arrangement makes present continuous appropriate.",
            rule: "Present Continuous can express confirmed future arrangements (meeting, dinner, flight).",
            example: "I'm having dinner with my parents tonight.",
          },
          difficulty: "hard",
        },
        {
          id: "fc-4",
          sentence: "By the time you arrive at the party tonight, most people ___ already ___ .",
          options: [
            "will ... leave",
            "will ... be leaving",
            "will ... have left",
            "are ... leaving",
          ],
          correctIndex: 2,
          explanation: {
            whyCorrect: "\"By the time\" + a future point = an action completed before that point. Future perfect: will have + past participle.",
            rule: "Future Perfect (will have + past participle) for actions completed before a future point.",
            example: "By next year, she will have graduated from university.",
          },
          difficulty: "hard",
        },
        {
          id: "fc-5",
          sentence: "In five years, I ___ from university and hopefully ___ a good job.",
          options: [
            "graduate / find",
            "will graduate / will find",
            "will have graduated / will have found",
            "am graduating / am finding",
          ],
          correctIndex: 2,
          explanation: {
            whyCorrect: "\"In five years\" = completed by a future point. Both actions will be finished by then = future perfect.",
            rule: "\"By\" or \"in [X years]\" + completed action = Future Perfect.",
            example: "By 2030, they will have built the new hospital.",
          },
          difficulty: "hard",
        },
      ],
    },
    {
      id: "future-mixed",
      title: "Future Tenses: Mixed Practice",
      subtitle: "Choose the right future form",
      questions: [
        {
          id: "fm-1",
          sentence: "\"What are your plans for tonight?\" \"I ___ watch a movie. I already downloaded one.\" \"Oh nice, I think I ___ join you!\"",
          options: [
            "am going to / will",
            "will / am going to",
            "am going to / am going to",
            "will / will",
          ],
          correctIndex: 0,
          explanation: {
            whyCorrect: "First speaker has a prior plan (already downloaded) = going to. Second speaker makes a spontaneous decision = will.",
            rule: "Prior plan = going to. Spontaneous decision at the moment = will.",
            example: "\"I'm going to cook dinner.\" \"That sounds great, I'll bring dessert!\"",
          },
          difficulty: "hard",
        },
        {
          id: "fm-2",
          sentence: "The doctor says: \"If you don't rest, you ___ feel worse. I'm serious — take a week off.\"",
          options: ["are going to", "will", "feel", "are feeling"],
          correctIndex: 1,
          explanation: {
            whyCorrect: "Conditional prediction (if + present, will + base verb). The doctor is making a warning/prediction.",
            rule: "First conditional: If + present simple, ... will + base verb (real future possibility).",
            example: "If you eat too much, you will feel sick.",
          },
          difficulty: "medium",
        },
        {
          id: "fm-3",
          sentence: "This time next week, we ___ on a plane to London for our holiday!",
          options: ["sit", "will sit", "will be sitting", "are going to sit"],
          correctIndex: 2,
          explanation: {
            whyCorrect: "\"This time next week\" = specific future moment. Action in progress at that moment = future continuous.",
            rule: "\"This time\" + future time = Future Continuous (will be + -ing).",
            example: "This time tomorrow, I will be sleeping in a five-star hotel.",
          },
          difficulty: "medium",
        },
        {
          id: "fm-4",
          sentence: "By the end of this course, you ___ all three English tense groups. Congratulations in advance!",
          options: [
            "learn",
            "will learn",
            "will have learned",
            "are going to learn",
          ],
          correctIndex: 2,
          explanation: {
            whyCorrect: "\"By the end of this course\" = completed by a future deadline. Future perfect.",
            rule: "\"By the end of\" / \"by next\" + future deadline = Future Perfect for completion.",
            example: "By Friday, I will have finished the project.",
          },
          difficulty: "hard",
        },
        {
          id: "fm-5",
          sentence: "You see your friend packing a suitcase. You ask: \"___ you ___ somewhere?\"",
          options: [
            "Will ... go",
            "Are ... going",
            "Do ... go",
            "Have ... gone",
          ],
          correctIndex: 1,
          explanation: {
            whyCorrect: "You see evidence (packing) and ask about a future arrangement/plan. Present continuous for confirmed arrangements.",
            rule: "Asking about plans with visible evidence = present continuous for future.",
            example: "Are you coming to the party tonight?",
          },
          difficulty: "medium",
        },
      ],
    },
  ],
  examQuestions: [
    {
      id: "fe-1",
      sentence: "\"Can someone help me carry these boxes?\" \"Sure, I ___ help you!\"",
      options: ["am going to", "will", "am", "would"],
      correctIndex: 1,
      explanation: {
        whyCorrect: "Spontaneous offer made at the moment of speaking = \"will.\"",
        rule: "Spontaneous decisions and offers = will.",
        example: "\"I'm thirsty.\" \"I'll get you some water.\"",
      },
      difficulty: "easy",
    },
    {
      id: "fe-2",
      sentence: "She ___ start a new job next Monday. She signed the contract last week.",
      options: ["will", "is going to", "is", "starts"],
      correctIndex: 1,
      explanation: {
        whyCorrect: "\"Signed the contract\" = prior plan with evidence. \"Going to\" for pre-arranged intentions.",
        rule: "Evidence of prior planning = going to.",
        example: "He's going to propose to her tonight. He bought the ring yesterday.",
      },
      difficulty: "easy",
    },
    {
      id: "fe-3",
      sentence: "This time next year, I ___ in a completely different country!",
      options: ["live", "will live", "will be living", "lived"],
      correctIndex: 2,
      explanation: {
        whyCorrect: "\"This time next year\" = specific future moment. Action in progress at that point = future continuous.",
        rule: "This time + future = future continuous.",
        example: "This time next month, we will be celebrating our anniversary.",
      },
      difficulty: "medium",
    },
    {
      id: "fe-4",
      sentence: "By the time we get to the restaurant tonight, they ___ probably ___ all the fresh seafood.",
      options: [
        "will ... sell",
        "are ... selling",
        "will ... have sold",
        "had ... sold",
      ],
      correctIndex: 2,
      explanation: {
        whyCorrect: "\"By the time\" + future = action completed before a future moment = future perfect.",
        rule: "By the time + present simple, ... will have + past participle.",
        example: "By the time you wake up, I will have already left for work.",
      },
      difficulty: "hard",
    },
    {
      id: "fe-5",
      sentence: "Look at that child near the pool! He's running too fast. He ___ fall in!",
      options: ["will", "is going to", "falls", "is falling"],
      correctIndex: 1,
      explanation: {
        whyCorrect: "Visible evidence right now (running near pool) = \"going to\" for evidence-based prediction.",
        rule: "See evidence now → going to. Opinion/belief → will.",
        example: "Watch out! That vase is going to fall!",
      },
      difficulty: "easy",
    },
    {
      id: "fe-6",
      sentence: "\"I haven't decided where to go for dinner.\" \"Let's try that new Thai place. I think you ___ love it!\"",
      options: ["are going to", "will", "are loving", "love"],
      correctIndex: 1,
      explanation: {
        whyCorrect: "\"I think\" = opinion-based prediction. No evidence or prior plan = \"will.\"",
        rule: "I think/believe/expect + will = prediction based on opinion.",
        example: "I think she'll enjoy the movie. It's her favorite genre.",
      },
      difficulty: "medium",
    },
  ],
};

// ---------------------------------------------------------------------------
// Final Exam Questions (mixed from all 3 units)
// ---------------------------------------------------------------------------

export const FINAL_EXAM_QUESTIONS: GrammarQuestion[] = [
  {
    id: "final-1",
    sentence: "Every Saturday, my family ___ together for lunch. It's our tradition.",
    options: ["eat", "eats", "is eating", "ate"],
    correctIndex: 1,
    explanation: {
      whyCorrect: "\"Every Saturday\" = habitual action. \"My family\" = singular collective noun.",
      rule: "Simple Present for habitual actions. Collective nouns take singular verbs.",
      example: "Our team meets every Monday morning.",
    },
    difficulty: "easy",
  },
  {
    id: "final-2",
    sentence: "Quiet, please! The presenter ___ something very important right now.",
    options: ["explains", "explained", "is explaining", "has explained"],
    correctIndex: 2,
    explanation: {
      whyCorrect: "\"Right now\" = action in progress at this moment = present continuous.",
      rule: "Present Continuous for actions happening at the moment of speaking.",
      example: "Listen! The teacher is reading the exam instructions.",
    },
    difficulty: "easy",
  },
  {
    id: "final-3",
    sentence: "Last Friday, the company ___ its 10th anniversary with a big party.",
    options: ["celebrates", "celebrated", "was celebrating", "has celebrated"],
    correctIndex: 1,
    explanation: {
      whyCorrect: "\"Last Friday\" = specific past time = simple past.",
      rule: "Simple Past for completed events at a specific past time.",
      example: "They opened the new office last month.",
    },
    difficulty: "easy",
  },
  {
    id: "final-4",
    sentence: "I ___ to three different countries this year. My next trip is in December.",
    options: ["travel", "traveled", "have traveled", "will travel"],
    correctIndex: 2,
    explanation: {
      whyCorrect: "\"This year\" = a period that includes now. Experience in an unfinished time period = present perfect.",
      rule: "Present Perfect for experiences in a time period that is not yet finished (today, this week, this year).",
      example: "She has read five books this month.",
    },
    difficulty: "medium",
  },
  {
    id: "final-5",
    sentence: "When she ___ at the party last night, everyone ___ for over an hour already.",
    options: [
      "arrived / had been dancing",
      "arrives / was dancing",
      "arrived / danced",
      "had arrived / was dancing",
    ],
    correctIndex: 0,
    explanation: {
      whyCorrect: "\"Arrived\" = the later past event (simple past). \"Had been dancing\" = the earlier, ongoing action (past perfect continuous).",
      rule: "Simple Past for the reference event. Past Perfect (Continuous) for the earlier ongoing action.",
      example: "By the time the teacher came, the students had been waiting for 20 minutes.",
    },
    difficulty: "hard",
  },
  {
    id: "final-6",
    sentence: "\"My computer just crashed!\" \"Don't panic. I ___ take a look at it for you.\"",
    options: ["am going to", "will", "am", "take"],
    correctIndex: 1,
    explanation: {
      whyCorrect: "Spontaneous offer made at the moment of speaking = \"will.\"",
      rule: "Will for spontaneous offers and decisions.",
      example: "\"I forgot my wallet.\" \"Don't worry, I'll pay.\"",
    },
    difficulty: "easy",
  },
  {
    id: "final-7",
    sentence: "While I ___ to music in my room last evening, my mom ___ me to come help with dinner.",
    options: [
      "listened / asked",
      "was listening / asked",
      "listened / was asking",
      "had listened / asked",
    ],
    correctIndex: 1,
    explanation: {
      whyCorrect: "\"While\" + ongoing action = past continuous. Mom asking = sudden interruption = simple past.",
      rule: "While + past continuous (background) + simple past (interruption).",
      example: "While he was sleeping, someone knocked on the door.",
    },
    difficulty: "medium",
  },
  {
    id: "final-8",
    sentence: "By the time the new airport ___ in 2028, the city ___ over two billion dollars on the project.",
    options: [
      "opens / will have spent",
      "will open / spends",
      "opens / will spend",
      "opened / had spent",
    ],
    correctIndex: 0,
    explanation: {
      whyCorrect: "\"By the time\" + present simple (future time clause), will have + past participle = future perfect for completion before a future event.",
      rule: "By the time + present simple, ... will have + past participle (future perfect).",
      example: "By the time you graduate, you will have studied for four years.",
    },
    difficulty: "hard",
  },
  {
    id: "final-9",
    sentence: "She ___ as a nurse for ten years before she ___ to become a doctor.",
    options: [
      "worked / decided",
      "had worked / decided",
      "was working / decided",
      "works / decides",
    ],
    correctIndex: 1,
    explanation: {
      whyCorrect: "\"For ten years before she decided\" = the working happened first, over a period, before the decision. Past perfect for the earlier duration.",
      rule: "Past Perfect for an action/state that lasted before another past event.",
      example: "They had lived in London for five years before they moved to Paris.",
    },
    difficulty: "hard",
  },
  {
    id: "final-10",
    sentence: "This time next Saturday, I ___ on a tropical beach, sipping a cold drink!",
    options: ["sit", "will sit", "will be sitting", "am going to sit"],
    correctIndex: 2,
    explanation: {
      whyCorrect: "\"This time next Saturday\" = specific future moment. Action in progress at that point = future continuous.",
      rule: "This time + future time = future continuous (will be + -ing).",
      example: "This time tomorrow, we will be flying over the Pacific Ocean.",
    },
    difficulty: "medium",
  },
];

// ---------------------------------------------------------------------------
// Export all tenses units (DO NOT add non-tense topics here)
// ---------------------------------------------------------------------------

export const GRAMMAR_UNITS: GrammarUnit[] = [PRESENT_UNIT, PAST_UNIT, FUTURE_UNIT];

/** Total number of grammar lessons across tenses units only. */
export const TOTAL_GRAMMAR_LESSONS = GRAMMAR_UNITS.reduce(
  (sum, u) => sum + u.lessons.length,
  0
);

// ---------------------------------------------------------------------------
// Grammar Topics — standalone topics outside the 12-tenses curriculum
// ---------------------------------------------------------------------------

const PASSIVE_VOICE_UNIT: GrammarUnit = {
  id: "topic-passive-voice",
  title: "Passive Voice",
  emoji: "\u{1F504}",
  description: "Learn how to shift focus from the doer to the receiver of an action",
  color: "amber",
  lessons: [
    {
      id: "passive-present-simple",
      title: "Present Simple Passive",
      subtitle: "is/am/are + past participle",
      questions: [
        {
          id: "pv-ps-1",
          sentence:
            "In this factory, over 500 cars ___ every month.",
          options: ["produce", "are produced", "is produced", "produces"],
          correctIndex: 1,
          explanation: {
            whyCorrect:
              "\"Cars\" is the subject receiving the action. Plural subject = \"are\" + past participle \"produced.\"",
            whyWrong:
              "\"Produce\" is active voice. \"Is produced\" is singular. \"Produces\" is active third-person.",
            rule: "Present Simple Passive: Subject + am/is/are + past participle (V3).",
            example: "English is spoken in many countries.",
          },
          difficulty: "easy",
        },
        {
          id: "pv-ps-2",
          sentence:
            "At our school, students ___ to wear uniforms every day.",
          options: ["require", "requires", "are required", "is required"],
          correctIndex: 2,
          explanation: {
            whyCorrect:
              "\"Students\" (plural) receive the requirement. Passive: are + required.",
            whyWrong:
              "\"Require\" and \"requires\" are active voice. \"Is required\" is for singular subjects.",
            rule: "Use passive when the receiver of the action is the subject of the sentence.",
            example: "All employees are expected to arrive on time.",
          },
          difficulty: "easy",
        },
        {
          id: "pv-ps-3",
          sentence:
            "Every year, the Nobel Prize ___ to outstanding scientists and writers.",
          options: ["gives", "is given", "are given", "given"],
          correctIndex: 1,
          explanation: {
            whyCorrect:
              "\"The Nobel Prize\" (singular) receives the action of giving. Passive: is + given.",
            whyWrong:
              "\"Gives\" is active. \"Are given\" would need a plural subject. \"Given\" alone is incomplete.",
            rule: "Singular subject + is + V3 for present simple passive.",
            example: "The report is submitted at the end of each month.",
          },
          difficulty: "easy",
        },
        {
          id: "pv-ps-4",
          sentence:
            "These days, most emails ___ on smartphones, not computers.",
          options: ["read", "reads", "is read", "are read"],
          correctIndex: 3,
          explanation: {
            whyCorrect:
              "\"Most emails\" (plural) receive the action. Passive: are + read (past participle of read).",
            whyWrong:
              "\"Read\" (base form) and \"reads\" are active voice. \"Is read\" needs a singular subject.",
            rule: "Plural subject + are + V3. Note: \"read\" has the same form for base and past participle.",
            example: "These books are sold in every bookstore.",
          },
          difficulty: "medium",
        },
        {
          id: "pv-ps-5",
          sentence:
            "In Japan, shoes ___ before entering a house. It is a cultural tradition.",
          options: ["remove", "removes", "are removed", "is removed"],
          correctIndex: 2,
          explanation: {
            whyCorrect:
              "\"Shoes\" (plural) receive the action. We don't focus on who removes them. Passive: are removed.",
            whyWrong:
              "Active forms don't fit because the sentence focuses on what happens to the shoes, not who does it.",
            rule: "Use passive when the doer is unknown, obvious, or unimportant.",
            example: "The streets are cleaned every morning.",
          },
          difficulty: "medium",
        },
      ],
    },
    {
      id: "passive-past-simple",
      title: "Past Simple Passive",
      subtitle: "was/were + past participle",
      questions: [
        {
          id: "pv-past-1",
          sentence:
            "The Eiffel Tower ___ in 1889 for the World's Fair in Paris.",
          options: ["built", "was built", "were built", "is built"],
          correctIndex: 1,
          explanation: {
            whyCorrect:
              "\"The Eiffel Tower\" (singular) received the action in the past. Passive: was + built.",
            whyWrong:
              "\"Built\" alone is incomplete passive. \"Were built\" needs plural. \"Is built\" is present tense.",
            rule: "Past Simple Passive: Subject + was/were + past participle (V3).",
            example: "America was discovered by Columbus in 1492.",
          },
          difficulty: "easy",
        },
        {
          id: "pv-past-2",
          sentence:
            "During the storm last night, several trees ___ by strong winds.",
          options: ["knocked down", "was knocked down", "were knocked down", "are knocked down"],
          correctIndex: 2,
          explanation: {
            whyCorrect:
              "\"Several trees\" (plural) + past event. Passive: were + knocked down.",
            whyWrong:
              "\"Knocked down\" alone lacks the auxiliary. \"Was\" is singular. \"Are\" is present tense.",
            rule: "Plural subject + were + V3 for past simple passive.",
            example: "Many houses were damaged by the earthquake.",
          },
          difficulty: "easy",
        },
        {
          id: "pv-past-3",
          sentence:
            "The letter ___ to the wrong address, so it arrived two weeks late.",
          options: ["sent", "was sent", "were sent", "is sent"],
          correctIndex: 1,
          explanation: {
            whyCorrect:
              "\"The letter\" (singular) + past event (arrived late). Passive: was + sent.",
            whyWrong:
              "\"Sent\" alone is incomplete. \"Were sent\" needs plural. \"Is sent\" is present.",
            rule: "When we focus on what happened to something, use passive voice.",
            example: "The package was delivered yesterday morning.",
          },
          difficulty: "easy",
        },
        {
          id: "pv-past-4",
          sentence:
            "Last year, a new hospital ___ in the center of the city to serve more patients.",
          options: ["opens", "opened", "was opened", "were opened"],
          correctIndex: 2,
          explanation: {
            whyCorrect:
              "\"A new hospital\" (singular) received the action of being opened. Past passive: was opened.",
            whyWrong:
              "\"Opens\" is present active. \"Opened\" could be active but the focus is on the hospital, not who opened it. \"Were opened\" is plural.",
            rule: "Use past passive when describing completed actions done to the subject.",
            example: "The new bridge was opened by the mayor last month.",
          },
          difficulty: "medium",
        },
        {
          id: "pv-past-5",
          sentence:
            "When I was a child, all the meals in our house ___ by my grandmother.",
          options: ["cook", "cooked", "was cooked", "were cooked"],
          correctIndex: 3,
          explanation: {
            whyCorrect:
              "\"All the meals\" (plural) + past time (\"when I was a child\"). Passive: were cooked. \"By my grandmother\" names the doer.",
            whyWrong:
              "\"Cook\" and \"cooked\" are active. \"Was cooked\" is singular.",
            rule: "Use \"by + agent\" in passive when you want to mention who performed the action.",
            example: "The song was written by a famous composer.",
          },
          difficulty: "medium",
        },
      ],
    },
    {
      id: "passive-sentence-builder",
      title: "Build Passive Sentences",
      subtitle: "Arrange words to form correct passive voice",
      questions: [], // Exercises managed by PassiveSentenceBuilder component
      exerciseCount: 5,
    },
  ],
  examQuestions: [
    {
      id: "pv-exam-1",
      sentence:
        "Rice ___ in many Asian countries. It is a staple food.",
      options: ["grows", "is grown", "are grown", "grown"],
      correctIndex: 1,
      explanation: {
        whyCorrect: "\"Rice\" (uncountable, singular) receives the action. Present passive: is grown.",
        rule: "Uncountable nouns use \"is\" in present passive.",
        example: "Coffee is produced in Brazil.",
      },
      difficulty: "easy",
    },
    {
      id: "pv-exam-2",
      sentence:
        "The Mona Lisa ___ by Leonardo da Vinci in the early 1500s.",
      options: ["painted", "was painted", "is painted", "were painted"],
      correctIndex: 1,
      explanation: {
        whyCorrect: "\"The Mona Lisa\" (singular) + past time (1500s). Past passive: was painted.",
        rule: "Past Simple Passive: was/were + V3.",
        example: "The pyramids were built thousands of years ago.",
      },
      difficulty: "easy",
    },
    {
      id: "pv-exam-3",
      sentence:
        "In our office, all computers ___ off at the end of each workday.",
      options: ["turn", "turns", "are turned", "was turned"],
      correctIndex: 2,
      explanation: {
        whyCorrect: "\"All computers\" (plural) + habitual action. Present passive: are turned off.",
        rule: "Plural subject + are + V3 in present simple passive.",
        example: "The doors are locked every night at ten.",
      },
      difficulty: "medium",
    },
    {
      id: "pv-exam-4",
      sentence:
        "Three suspects ___ by the police after the robbery last Friday.",
      options: ["arrested", "was arrested", "were arrested", "are arrested"],
      correctIndex: 2,
      explanation: {
        whyCorrect: "\"Three suspects\" (plural) + past event (last Friday). Past passive: were arrested.",
        rule: "Plural subject + were + V3 for past passive.",
        example: "Two paintings were stolen from the museum last month.",
      },
      difficulty: "medium",
    },
    {
      id: "pv-exam-5",
      sentence:
        "This bridge ___ in 1965. It ___ by thousands of people every day now.",
      options: [
        "was built / is used",
        "built / used",
        "is built / was used",
        "were built / are used",
      ],
      correctIndex: 0,
      explanation: {
        whyCorrect:
          "First blank: past event (1965) → was built. Second blank: present habit (every day now) → is used.",
        rule: "Match the tense to the time marker: past time → was/were + V3, present time → is/are + V3.",
        example: "The school was founded in 1900. It is attended by 2,000 students today.",
      },
      difficulty: "hard",
    },
    {
      id: "pv-exam-6",
      sentence:
        "The results of the exam ___ next Monday. Students are waiting anxiously.",
      options: ["announce", "announced", "will be announced", "are announced"],
      correctIndex: 2,
      explanation: {
        whyCorrect:
          "\"Next Monday\" = future time. Future passive: will be + announced. (Bonus preview of future passive!)",
        rule: "Future Simple Passive: will be + V3.",
        example: "The winner will be announced tomorrow.",
      },
      difficulty: "hard",
    },
  ],
};

// ---------------------------------------------------------------------------
// Modal Verbs Topic
// ---------------------------------------------------------------------------

const MODAL_VERBS_UNIT: GrammarUnit = {
  id: "topic-modal-verbs",
  title: "Modal Verbs",
  emoji: "\u{1F4AC}",
  description: "Master can, should, must, might, would and more",
  color: "blue",
  lessons: [
    {
      id: "modal-basics-1",
      title: "Can, Could & May",
      subtitle: "Ability, possibility, permission",
      questions: [
        {
          id: "mv-q1",
          sentence: "My sister ___ speak French fluently because she lived in Paris for 5 years.",
          options: ["can", "must", "should", "might"],
          correctIndex: 0,
          explanation: {
            whyCorrect: "\"Can\" expresses present ability. She has the skill because of her experience.",
            whyWrong: "\"Must\" = obligation. \"Should\" = advice. \"Might\" = uncertain possibility. None fit 'ability' here.",
            rule: "Use \"can\" for present ability or skill.",
            example: "He can play the guitar very well.",
          },
          difficulty: "easy",
        },
        {
          id: "mv-q2",
          sentence: "When I was younger, I ___ run a marathon without any training.",
          options: ["can", "could", "might", "should"],
          correctIndex: 1,
          explanation: {
            whyCorrect: "\"Could\" expresses past ability — something you were once able to do.",
            whyWrong: "\"Can\" is present ability. \"Might\" = possibility. \"Should\" = advice.",
            rule: "Use \"could\" for ability in the past.",
            example: "She could dance beautifully when she was young.",
          },
          difficulty: "easy",
        },
        {
          id: "mv-q3",
          sentence: "Excuse me, ___ I borrow your pen for a moment?",
          options: ["must", "should", "may", "will"],
          correctIndex: 2,
          explanation: {
            whyCorrect: "\"May I...?\" is a polite way to ask for permission, especially in formal situations.",
            whyWrong: "\"Must\" = obligation. \"Should\" = advice. \"Will\" doesn't ask permission.",
            rule: "Use \"may\" for formal permission requests.",
            example: "May I leave the meeting early today?",
          },
          difficulty: "medium",
        },
        {
          id: "mv-q4",
          sentence: "___ you help me carry these boxes to the car? They're very heavy.",
          options: ["Must", "Should", "Could", "Might"],
          correctIndex: 2,
          explanation: {
            whyCorrect: "\"Could you...?\" is a polite way to request someone's help. It's less direct than \"can\".",
            whyWrong: "\"Must\" = commanding. \"Should\" = advice. \"Might\" doesn't make requests.",
            rule: "Use \"could\" for polite requests.",
            example: "Could you please close the window?",
          },
          difficulty: "medium",
        },
        {
          id: "mv-q5",
          sentence: "The restaurant ___ be closed today — I see no lights inside and the sign says 'Closed'.",
          options: ["should", "might", "can", "could"],
          correctIndex: 1,
          explanation: {
            whyCorrect: "\"Might\" expresses possibility — we're guessing based on evidence but aren't 100% sure.",
            whyWrong: "\"Should\" = expectation. \"Can\" = ability. \"Could\" is also possible but \"might\" better expresses uncertain deduction.",
            rule: "Use \"might\" when you think something is possible but you're not certain.",
            example: "She might come to the party — I'm not sure.",
          },
          difficulty: "medium",
        },
      ],
    },
    {
      id: "modal-basics-2",
      title: "Must, Should & Would",
      subtitle: "Obligation, advice, polite forms",
      questions: [
        {
          id: "mv-q6",
          sentence: "Students ___ submit their assignments before the deadline. No exceptions.",
          options: ["should", "might", "must", "could"],
          correctIndex: 2,
          explanation: {
            whyCorrect: "\"Must\" expresses strong obligation — this is a strict rule with no flexibility.",
            whyWrong: "\"Should\" = advice (optional). \"Might\" = possibility. \"Could\" = ability/request.",
            rule: "Use \"must\" for rules, obligations, and strong necessity.",
            example: "You must wear a uniform at school.",
          },
          difficulty: "easy",
        },
        {
          id: "mv-q7",
          sentence: "You look exhausted. You ___ take a day off and rest.",
          options: ["must", "should", "might", "can"],
          correctIndex: 1,
          explanation: {
            whyCorrect: "\"Should\" gives friendly advice — it's a recommendation, not an order.",
            whyWrong: "\"Must\" is too forceful for friendly advice. \"Might\" = possibility. \"Can\" = ability.",
            rule: "Use \"should\" to give advice or recommend something.",
            example: "You should see a doctor about that cough.",
          },
          difficulty: "easy",
        },
        {
          id: "mv-q8",
          sentence: "___ you like to join us for dinner tonight? We're going to that new Italian place.",
          options: ["Should", "Must", "Would", "Can"],
          correctIndex: 2,
          explanation: {
            whyCorrect: "\"Would you like to...?\" is the standard polite invitation form.",
            whyWrong: "\"Should\" = advice. \"Must\" = obligation. \"Can\" works but is less polite than \"would\".",
            rule: "Use \"would\" for polite offers, invitations, and requests.",
            example: "Would you like some more coffee?",
          },
          difficulty: "medium",
        },
        {
          id: "mv-q9",
          sentence: "If I won the lottery, I ___ travel around the world for a year.",
          options: ["will", "would", "must", "should"],
          correctIndex: 1,
          explanation: {
            whyCorrect: "\"Would\" is used for hypothetical/imaginary situations. Winning the lottery is an unlikely scenario.",
            whyWrong: "\"Will\" = real future plans. \"Must\" = obligation. \"Should\" = advice.",
            rule: "Use \"would\" for hypothetical or conditional situations.",
            example: "If I had more time, I would learn Japanese.",
          },
          difficulty: "hard",
        },
        {
          id: "mv-q10",
          sentence: "You ___ not park here — it's a fire lane and you'll get a fine.",
          options: ["should", "might", "must", "would"],
          correctIndex: 2,
          explanation: {
            whyCorrect: "\"Must not\" expresses prohibition — parking here is forbidden by law.",
            whyWrong: "\"Should not\" = advice (weaker). \"Might not\" = possibility. \"Would not\" = hypothetical.",
            rule: "Use \"must not\" for prohibition — things that are forbidden.",
            example: "You must not use your phone during the exam.",
          },
          difficulty: "medium",
        },
      ],
    },
    {
      id: "modal-fill-blank",
      title: "Fill the Modal",
      subtitle: "Tap to complete sentences with modals",
      questions: [],
      exerciseCount: 6,
    },
    {
      id: "modal-mastery",
      title: "Modal Mastery",
      subtitle: "Match meanings & solve scenarios",
      questions: [],
      exerciseCount: 6,
    },
  ],
  examQuestions: [
    {
      id: "mv-exam-1",
      sentence: "You ___ drive without a license. It's against the law.",
      options: ["shouldn't", "might not", "must not", "wouldn't"],
      correctIndex: 2,
      explanation: {
        whyCorrect: "\"Must not\" = prohibition. Driving without a license is illegal.",
        rule: "\"Must not\" expresses prohibition — something forbidden.",
        example: "You must not enter this area without permission.",
      },
      difficulty: "easy",
    },
    {
      id: "mv-exam-2",
      sentence: "It's getting late. We ___ leave soon if we want to catch the last train.",
      options: ["might", "should", "would", "can"],
      correctIndex: 1,
      explanation: {
        whyCorrect: "\"Should\" gives practical advice about timing. It's a recommendation based on circumstances.",
        rule: "\"Should\" = advice or recommendation.",
        example: "We should hurry — the shop closes in 10 minutes.",
      },
      difficulty: "easy",
    },
    {
      id: "mv-exam-3",
      sentence: "She ___ be at home right now — I just saw her car in the driveway.",
      options: ["must", "should", "would", "can"],
      correctIndex: 0,
      explanation: {
        whyCorrect: "\"Must\" expresses logical deduction — strong certainty based on evidence (her car is there).",
        rule: "\"Must\" can express strong deduction: \"I'm almost certain this is true.\"",
        example: "He must be tired — he's been working for 12 hours.",
      },
      difficulty: "medium",
    },
    {
      id: "mv-exam-4",
      sentence: "___ you mind opening the window? It's quite warm in here.",
      options: ["Could", "Should", "Would", "Must"],
      correctIndex: 2,
      explanation: {
        whyCorrect: "\"Would you mind...?\" is a very polite way to make a request.",
        rule: "\"Would you mind + -ing?\" is one of the most polite request forms in English.",
        example: "Would you mind waiting for a few minutes?",
      },
      difficulty: "medium",
    },
    {
      id: "mv-exam-5",
      sentence: "When I was a child, I ___ climb trees very easily, but now I'm afraid of heights.",
      options: ["can", "could", "might", "should"],
      correctIndex: 1,
      explanation: {
        whyCorrect: "\"Could\" = past ability. The speaker had this ability as a child but no longer does.",
        rule: "Use \"could\" (not \"can\") for abilities you had in the past.",
        example: "She could read before she started school.",
      },
      difficulty: "medium",
    },
    {
      id: "mv-exam-6",
      sentence: "Take an umbrella — it ___ rain this afternoon according to the forecast.",
      options: ["must", "should", "might", "would"],
      correctIndex: 2,
      explanation: {
        whyCorrect: "\"Might\" = uncertain possibility. Weather forecasts aren't 100% certain.",
        rule: "\"Might\" expresses possibility when you're not sure something will happen.",
        example: "The flight might be delayed due to bad weather.",
      },
      difficulty: "easy",
    },
  ],
};

/** Standalone grammar topics — separate from the 12-tenses curriculum. */
export const GRAMMAR_TOPICS: GrammarUnit[] = [PASSIVE_VOICE_UNIT, MODAL_VERBS_UNIT];

/** Total lessons across all grammar topics. */
export const TOTAL_TOPIC_LESSONS = GRAMMAR_TOPICS.reduce(
  (sum, u) => sum + u.lessons.length,
  0
);
