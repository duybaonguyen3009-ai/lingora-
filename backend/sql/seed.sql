-- =============================================================================
-- Lingora – Seed Data
-- Run AFTER schema.sql.
-- Safe to re-run: uses INSERT ... ON CONFLICT DO NOTHING on stable UUIDs.
-- =============================================================================

BEGIN;

-- =============================================================================
-- LESSONS  (fixed UUIDs so child rows can reference them safely)
-- =============================================================================
INSERT INTO lessons (id, title, description, level, order_index) VALUES
(
    'a1000000-0000-0000-0000-000000000001',
    'Hello & Introductions',
    'Learn how to greet people, say your name, and ask basic questions.',
    'beginner', 1
),
(
    'a1000000-0000-0000-0000-000000000002',
    'My Family',
    'Talk about your family members and describe who they are.',
    'beginner', 2
),
(
    'a1000000-0000-0000-0000-000000000003',
    'Daily Routine',
    'Describe what you do every day using action words and time phrases.',
    'beginner', 3
)
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- VOCAB ITEMS
-- =============================================================================

-- ── Lesson 1: Hello & Introductions ─────────────────────────────────────────
INSERT INTO vocab_items (lesson_id, word, meaning, example_sentence, pronunciation) VALUES
(
    'a1000000-0000-0000-0000-000000000001',
    'hello',
    'A greeting used when you meet someone.',
    'Hello! My name is Lily.',
    '/həˈloʊ/'
),
(
    'a1000000-0000-0000-0000-000000000001',
    'goodbye',
    'What you say when you leave someone.',
    'Goodbye! See you tomorrow.',
    '/ˌɡʊdˈbaɪ/'
),
(
    'a1000000-0000-0000-0000-000000000001',
    'name',
    'The word people use to call you.',
    'My name is Sam.',
    '/neɪm/'
),
(
    'a1000000-0000-0000-0000-000000000001',
    'please',
    'A polite word used when asking for something.',
    'Can I have some water, please?',
    '/pliːz/'
),
(
    'a1000000-0000-0000-0000-000000000001',
    'thank you',
    'Words used to show you are grateful.',
    'Thank you for helping me!',
    '/ˈθæŋk juː/'
),
(
    'a1000000-0000-0000-0000-000000000001',
    'friend',
    'A person you like and enjoy spending time with.',
    'She is my best friend.',
    '/frɛnd/'
),
(
    'a1000000-0000-0000-0000-000000000001',
    'nice to meet you',
    'A polite phrase said when you first meet someone.',
    'Nice to meet you, Tom!',
    '/naɪs tə miːt juː/'
),
(
    'a1000000-0000-0000-0000-000000000001',
    'how are you',
    'A question asking someone about their wellbeing.',
    'How are you today?',
    '/haʊ ɑːr juː/'
);

-- ── Lesson 2: My Family ──────────────────────────────────────────────────────
INSERT INTO vocab_items (lesson_id, word, meaning, example_sentence, pronunciation) VALUES
(
    'a1000000-0000-0000-0000-000000000002',
    'mother',
    'Your female parent.',
    'My mother makes great pancakes.',
    '/ˈmʌðər/'
),
(
    'a1000000-0000-0000-0000-000000000002',
    'father',
    'Your male parent.',
    'My father reads me stories at night.',
    '/ˈfɑːðər/'
),
(
    'a1000000-0000-0000-0000-000000000002',
    'sister',
    'A girl or woman who has the same parents as you.',
    'My sister loves to paint pictures.',
    '/ˈsɪstər/'
),
(
    'a1000000-0000-0000-0000-000000000002',
    'brother',
    'A boy or man who has the same parents as you.',
    'My brother plays football every weekend.',
    '/ˈbrʌðər/'
),
(
    'a1000000-0000-0000-0000-000000000002',
    'grandmother',
    'The mother of your parent.',
    'My grandmother bakes delicious cookies.',
    '/ˈɡrænˌmʌðər/'
),
(
    'a1000000-0000-0000-0000-000000000002',
    'grandfather',
    'The father of your parent.',
    'My grandfather tells funny jokes.',
    '/ˈɡrænˌfɑːðər/'
),
(
    'a1000000-0000-0000-0000-000000000002',
    'family',
    'A group of people who are related to each other.',
    'I love spending time with my family.',
    '/ˈfæməli/'
),
(
    'a1000000-0000-0000-0000-000000000002',
    'baby',
    'A very young child.',
    'The baby is sleeping in the crib.',
    '/ˈbeɪbi/'
);

-- ── Lesson 3: Daily Routine ──────────────────────────────────────────────────
INSERT INTO vocab_items (lesson_id, word, meaning, example_sentence, pronunciation) VALUES
(
    'a1000000-0000-0000-0000-000000000003',
    'wake up',
    'To stop sleeping and open your eyes.',
    'I wake up at seven o''clock every morning.',
    '/weɪk ʌp/'
),
(
    'a1000000-0000-0000-0000-000000000003',
    'breakfast',
    'The first meal of the day.',
    'I eat breakfast before school.',
    '/ˈbrɛkfəst/'
),
(
    'a1000000-0000-0000-0000-000000000003',
    'school',
    'A place where children go to learn.',
    'I go to school by bus.',
    '/skuːl/'
),
(
    'a1000000-0000-0000-0000-000000000003',
    'lunch',
    'A meal eaten in the middle of the day.',
    'We eat lunch together in the canteen.',
    '/lʌntʃ/'
),
(
    'a1000000-0000-0000-0000-000000000003',
    'homework',
    'Schoolwork that you do at home.',
    'I do my homework after dinner.',
    '/ˈhoʊmˌwɜːrk/'
),
(
    'a1000000-0000-0000-0000-000000000003',
    'dinner',
    'The main meal of the day, usually eaten in the evening.',
    'We have dinner at six o''clock.',
    '/ˈdɪnər/'
),
(
    'a1000000-0000-0000-0000-000000000003',
    'brush teeth',
    'To clean your teeth with a toothbrush.',
    'I brush my teeth before bed.',
    '/brʌʃ tiːθ/'
),
(
    'a1000000-0000-0000-0000-000000000003',
    'sleep',
    'To rest your body and mind with your eyes closed.',
    'I sleep for nine hours every night.',
    '/sliːp/'
);


-- =============================================================================
-- QUIZ ITEMS
-- =============================================================================

-- ── Lesson 1: Hello & Introductions ─────────────────────────────────────────
INSERT INTO quiz_items (lesson_id, question, option_a, option_b, option_c, option_d, correct_option) VALUES
(
    'a1000000-0000-0000-0000-000000000001',
    'What do you say when you meet someone for the first time?',
    'Goodbye!',
    'Nice to meet you!',
    'Go away!',
    'I am sleeping.',
    'b'
),
(
    'a1000000-0000-0000-0000-000000000001',
    'Which word is a polite way to ask for something?',
    'now',
    'give',
    'please',
    'take',
    'c'
),
(
    'a1000000-0000-0000-0000-000000000001',
    'Fill in the blank: "My ___ is Anna."',
    'age',
    'color',
    'name',
    'food',
    'c'
),
(
    'a1000000-0000-0000-0000-000000000001',
    'What do you say to thank someone?',
    'Hello',
    'Sorry',
    'Goodbye',
    'Thank you',
    'd'
),
(
    'a1000000-0000-0000-0000-000000000001',
    'Which sentence is a correct greeting?',
    'I eat hello.',
    'Hello, how are you?',
    'Please goodbye.',
    'Name is friend.',
    'b'
);

-- ── Lesson 2: My Family ──────────────────────────────────────────────────────
INSERT INTO quiz_items (lesson_id, question, option_a, option_b, option_c, option_d, correct_option) VALUES
(
    'a1000000-0000-0000-0000-000000000002',
    'Who is the mother of your parent?',
    'sister',
    'aunt',
    'grandmother',
    'cousin',
    'c'
),
(
    'a1000000-0000-0000-0000-000000000002',
    'Which word means a very young child?',
    'brother',
    'baby',
    'father',
    'grandfather',
    'b'
),
(
    'a1000000-0000-0000-0000-000000000002',
    'Fill in the blank: "My ___ plays football every weekend."',
    'baby',
    'grandmother',
    'brother',
    'family',
    'c'
),
(
    'a1000000-0000-0000-0000-000000000002',
    'What is the word for your female parent?',
    'sister',
    'grandmother',
    'daughter',
    'mother',
    'd'
),
(
    'a1000000-0000-0000-0000-000000000002',
    'Which sentence uses "family" correctly?',
    'My family is sleeping the homework.',
    'I love spending time with my family.',
    'The family please goodbye.',
    'Family wake up breakfast.',
    'b'
);

-- ── Lesson 3: Daily Routine ──────────────────────────────────────────────────
INSERT INTO quiz_items (lesson_id, question, option_a, option_b, option_c, option_d, correct_option) VALUES
(
    'a1000000-0000-0000-0000-000000000003',
    'What is the first meal of the day called?',
    'lunch',
    'dinner',
    'snack',
    'breakfast',
    'd'
),
(
    'a1000000-0000-0000-0000-000000000003',
    'What do you do in the morning to clean your teeth?',
    'wake up',
    'brush teeth',
    'eat lunch',
    'do homework',
    'b'
),
(
    'a1000000-0000-0000-0000-000000000003',
    'Fill in the blank: "I ___ up at seven o''clock."',
    'sleep',
    'brush',
    'wake',
    'eat',
    'c'
),
(
    'a1000000-0000-0000-0000-000000000003',
    'Where do children go to learn?',
    'dinner',
    'homework',
    'sleep',
    'school',
    'd'
),
(
    'a1000000-0000-0000-0000-000000000003',
    'Which sentence describes a daily routine correctly?',
    'I sleep breakfast at school.',
    'Homework eats the dinner.',
    'I do my homework after dinner.',
    'Brush wake up lunch please.',
    'c'
);


-- =============================================================================
-- SPEAKING PROMPTS
-- =============================================================================

-- ── Lesson 1: Hello & Introductions ─────────────────────────────────────────
INSERT INTO speaking_prompts (lesson_id, prompt_text, sample_answer, hint) VALUES
(
    'a1000000-0000-0000-0000-000000000001',
    'Introduce yourself. Say your name and how old you are.',
    'Hello! My name is Lily. I am eight years old.',
    'Start with "Hello! My name is..."'
),
(
    'a1000000-0000-0000-0000-000000000001',
    'Greet your teacher in the morning.',
    'Good morning, teacher! How are you today?',
    'Use "Good morning" or "Hello".'
),
(
    'a1000000-0000-0000-0000-000000000001',
    'Someone helps you pick up your pencil. What do you say?',
    'Thank you very much! That is very kind.',
    'Use "thank you" in your answer.'
),
(
    'a1000000-0000-0000-0000-000000000001',
    'You see your friend after the weekend. What do you say first?',
    'Hello! How are you? Did you have a good weekend?',
    'Ask them how they are feeling.'
),
(
    'a1000000-0000-0000-0000-000000000001',
    'It is time to go home. Say goodbye to your classmates.',
    'Goodbye everyone! See you tomorrow. Have a great day!',
    'Use "goodbye" or "see you".'
);

-- ── Lesson 2: My Family ──────────────────────────────────────────────────────
INSERT INTO speaking_prompts (lesson_id, prompt_text, sample_answer, hint) VALUES
(
    'a1000000-0000-0000-0000-000000000002',
    'Tell me about your family. How many people are in it?',
    'My family has four people: my mother, my father, my sister, and me.',
    'Count each family member and name them.'
),
(
    'a1000000-0000-0000-0000-000000000002',
    'Describe what your mother or father looks like.',
    'My mother has long brown hair and kind eyes. She is tall.',
    'Use describing words like tall, short, kind, funny.'
),
(
    'a1000000-0000-0000-0000-000000000002',
    'What is your favourite thing to do with your family?',
    'My favourite thing is watching movies together on Friday nights.',
    'Think of a fun activity you enjoy together.'
),
(
    'a1000000-0000-0000-0000-000000000002',
    'Do you have a brother or a sister? Tell me something about them.',
    'I have a brother. His name is Tom. He is six years old and loves toy cars.',
    'Say their name, age, and one thing they like.'
),
(
    'a1000000-0000-0000-0000-000000000002',
    'Tell me about your grandparents.',
    'My grandmother is funny and she bakes great cookies. My grandfather tells wonderful stories.',
    'What do they like to do? What are they like?'
);

-- ── Lesson 3: Daily Routine ──────────────────────────────────────────────────
INSERT INTO speaking_prompts (lesson_id, prompt_text, sample_answer, hint) VALUES
(
    'a1000000-0000-0000-0000-000000000003',
    'What time do you wake up and what do you do first?',
    'I wake up at seven o''clock. First I brush my teeth and then I eat breakfast.',
    'Use "first", "then", "after" to connect your actions.'
),
(
    'a1000000-0000-0000-0000-000000000003',
    'Describe your morning routine from waking up to going to school.',
    'I wake up at seven, eat breakfast, brush my teeth, get dressed, and then go to school.',
    'Try to use at least four actions in order.'
),
(
    'a1000000-0000-0000-0000-000000000003',
    'What do you do after school?',
    'After school I eat a snack, do my homework, and then play outside.',
    'Think about homework, playing, and snacks.'
),
(
    'a1000000-0000-0000-0000-000000000003',
    'What do you eat for breakfast? Describe it.',
    'I eat toast with butter and drink a glass of orange juice for breakfast.',
    'Name the food and drink. Say if you like it!'
),
(
    'a1000000-0000-0000-0000-000000000003',
    'What is the last thing you do before you go to sleep?',
    'The last thing I do is brush my teeth and then my mother reads me a story.',
    'Think about bedtime habits like brushing teeth or reading.'
);

COMMIT;
