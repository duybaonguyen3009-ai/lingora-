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
// Export all units
// ---------------------------------------------------------------------------

export const GRAMMAR_UNITS: GrammarUnit[] = [PRESENT_UNIT, PAST_UNIT, FUTURE_UNIT];

/** Total number of grammar lessons across all units. */
export const TOTAL_GRAMMAR_LESSONS = GRAMMAR_UNITS.reduce(
  (sum, u) => sum + u.lessons.length,
  0
);
