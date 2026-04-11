/**
 * backend/scripts/seedBattleReadingBatch2.js
 *
 * Seeds 5 additional reading passages + questions into reading_passages
 * and reading_questions tables. Uses a transaction for atomicity.
 * Idempotent — skips passages whose ID already exists.
 *
 * Usage (from backend/ directory):
 *   node scripts/seedBattleReadingBatch2.js
 */

"use strict";

const path = require("path");

// ── Bootstrap ─────────────────────────────────────────────────
const BACKEND_DIR = path.resolve(__dirname, "..");
require("dotenv").config({ path: path.join(BACKEND_DIR, ".env"), override: true });

const { pool } = require(path.join(BACKEND_DIR, "src", "config", "db.js"));

// ── Seed data ─────────────────────────────────────────────────

const PASSAGES = [
  {
    id: "d4f2b7c1-9a6e-4c3d-8f21-5b7e9a2c1134",
    topic: "environment",
    difficulty: "band_55_70",
    estimated_minutes: 7,
    passage_title: "Deforestation and Its Global Impact",
    passage_text: "A. Deforestation is the large-scale removal of forests, often to make space for agriculture, industry, or urban development. In many parts of the world, especially in tropical regions, forests are being cleared at an alarming rate. This process not only destroys natural habitats but also reduces biodiversity, as many plant and animal species lose their homes.\n\nB. One of the main causes of deforestation is agriculture. Farmers cut down trees to create land for crops or livestock. While this can increase food production, it often leads to soil degradation. Without trees, the soil becomes less stable and more likely to be washed away by rain, reducing its fertility over time.\n\nC. Deforestation also plays a significant role in climate change. Trees absorb carbon dioxide from the atmosphere, helping to regulate the Earth\u2019s climate. When forests are cut down, this stored carbon is released back into the air, contributing to global warming. As a result, deforestation is considered one of the key environmental challenges today.\n\nD. To address deforestation, governments and organizations are promoting sustainable practices. These include reforestation projects, stricter laws, and encouraging the use of alternative materials. However, success depends on cooperation between countries, businesses, and individuals. Without collective action, it will be difficult to slow down the destruction of forests.",
    tags: ["environment"],
    created_by: "ai_generated",
    review_status: "pending",
    questions: [
      { order_index: 1, type: "mcq", question_text: "What is deforestation mainly described as in paragraph A?", options: { A: "The natural growth of forests", B: "The removal of forests for human use", C: "The protection of wildlife", D: "The increase in biodiversity" }, correct_answer: "B", explanation: "Paragraph A defines deforestation as the large-scale removal of forests for development." },
      { order_index: 2, type: "mcq", question_text: "Why does soil become less fertile after deforestation?", options: { A: "Because it receives too much sunlight", B: "Because animals damage it", C: "Because trees no longer protect it", D: "Because farmers stop using it" }, correct_answer: "C", explanation: "Paragraph B explains that without trees, soil becomes unstable and less fertile." },
      { order_index: 3, type: "mcq", question_text: "How does deforestation contribute to climate change?", options: { A: "By increasing oxygen levels", B: "By reducing rainfall", C: "By releasing stored carbon dioxide", D: "By creating more farmland" }, correct_answer: "C", explanation: "Paragraph C states that cutting trees releases stored carbon dioxide into the atmosphere." },
      { order_index: 4, type: "tfng", question_text: "Deforestation always improves the quality of soil.", options: null, correct_answer: "FALSE", explanation: "Paragraph B shows that deforestation leads to soil degradation." },
      { order_index: 5, type: "tfng", question_text: "Trees help reduce carbon dioxide in the atmosphere.", options: null, correct_answer: "TRUE", explanation: "Paragraph C explains that trees absorb carbon dioxide." },
      { order_index: 6, type: "tfng", question_text: "All countries have successfully stopped deforestation.", options: null, correct_answer: "NOT GIVEN", explanation: "The passage does not state that all countries have stopped deforestation." },
      { order_index: 7, type: "matching", question_text: "Match paragraph B with its main idea", options: { A: "Solutions to deforestation", B: "Effects on climate", C: "Agricultural causes and soil impact", D: "Definition of deforestation" }, correct_answer: "C", explanation: "Paragraph B discusses agriculture as a cause and its impact on soil." },
      { order_index: 8, type: "matching", question_text: "Match paragraph D with its main idea", options: { A: "Global warming causes", B: "Efforts to reduce deforestation", C: "Animal extinction", D: "Forest growth" }, correct_answer: "B", explanation: "Paragraph D focuses on solutions and actions to address deforestation." },
    ],
  },
  {
    id: "f2c9a1d7-6e4b-4b9c-9f2a-3d8e7c5a1123",
    topic: "technology",
    difficulty: "band_55_70",
    estimated_minutes: 7,
    passage_title: "The Impact of Artificial Intelligence on Daily Life",
    passage_text: "A. Artificial intelligence (AI) has become an important part of modern life. It refers to computer systems that can perform tasks that usually require human intelligence, such as recognizing speech or making decisions. Today, AI is used in many areas, including smartphones, online services, and even home devices. Its rapid development has changed how people interact with technology.\n\nB. One of the most noticeable uses of AI is in communication. Social media platforms and messaging apps use AI to suggest content, filter spam, and recommend friends. While this makes communication faster and more convenient, some people worry that it can reduce face-to-face interaction and create dependence on technology.\n\nC. AI is also transforming the workplace. In some industries, machines can now perform repetitive tasks more efficiently than humans. For example, robots are used in factories to assemble products. This can increase productivity and reduce costs, but it may also lead to job losses in certain sectors.\n\nD. Despite these challenges, AI offers many benefits for society. In healthcare, AI can help doctors diagnose diseases more accurately. In education, it can provide personalized learning experiences for students. However, experts believe it is important to use AI responsibly and ensure that its development benefits everyone.",
    tags: ["technology"],
    created_by: "ai_generated",
    review_status: "pending",
    questions: [
      { order_index: 1, type: "mcq", question_text: "What is artificial intelligence mainly described as?", options: { A: "A type of human intelligence", B: "A system that replaces all jobs", C: "Technology that performs tasks requiring human intelligence", D: "A communication tool only" }, correct_answer: "C", explanation: "Paragraph A defines AI as systems performing tasks requiring human intelligence." },
      { order_index: 2, type: "mcq", question_text: "What is one concern about AI in communication?", options: { A: "It increases human interaction", B: "It reduces dependence on technology", C: "It may reduce face-to-face interaction", D: "It makes communication slower" }, correct_answer: "C", explanation: "Paragraph B mentions concerns about reduced face-to-face interaction." },
      { order_index: 3, type: "mcq", question_text: "Why are robots used in factories?", options: { A: "To entertain workers", B: "To reduce productivity", C: "To perform tasks less efficiently", D: "To increase efficiency and reduce costs" }, correct_answer: "D", explanation: "Paragraph C explains robots improve efficiency and lower costs." },
      { order_index: 4, type: "tfng", question_text: "AI is only used in smartphones.", options: null, correct_answer: "FALSE", explanation: "Paragraph A states AI is used in many areas, not just smartphones." },
      { order_index: 5, type: "tfng", question_text: "AI can help doctors in healthcare.", options: null, correct_answer: "TRUE", explanation: "Paragraph D mentions AI helps diagnose diseases." },
      { order_index: 6, type: "tfng", question_text: "All workers will lose their jobs because of AI.", options: null, correct_answer: "NOT GIVEN", explanation: "The passage mentions possible job losses but does not say all workers will lose jobs." },
      { order_index: 7, type: "matching", question_text: "Match paragraph B with its main idea", options: { A: "AI in communication and its effects", B: "AI in healthcare", C: "Definition of AI", D: "AI in factories" }, correct_answer: "A", explanation: "Paragraph B discusses communication uses and concerns." },
      { order_index: 8, type: "matching", question_text: "Match paragraph C with its main idea", options: { A: "AI benefits in education", B: "AI in communication", C: "AI impact on jobs and industry", D: "AI history" }, correct_answer: "C", explanation: "Paragraph C focuses on workplace and industry impacts." },
    ],
  },
  {
    id: "b7e3c2d9-4a6f-4f1b-9c2e-8d5a1b3f7781",
    topic: "science",
    difficulty: "band_55_70",
    estimated_minutes: 7,
    passage_title: "Advances in Renewable Energy Research",
    passage_text: "A. Renewable energy has become a key focus of scientific research in recent years. Unlike fossil fuels, renewable sources such as solar, wind, and hydro power can be used without running out. Scientists are working to improve the efficiency and affordability of these energy sources to reduce dependence on traditional fuels and limit environmental damage.\n\nB. Solar energy is one of the fastest-growing renewable technologies. Researchers have developed more advanced solar panels that can capture sunlight more effectively, even in cloudy conditions. In addition, new materials are being tested to make solar panels cheaper to produce. These improvements could allow more households to access clean energy in the future.\n\nC. Wind energy is another important area of development. Modern wind turbines are larger and more powerful than earlier designs, allowing them to generate more electricity. Offshore wind farms, built in the sea, can take advantage of stronger and more consistent winds. However, the high cost of installation remains a challenge for many countries.\n\nD. Despite the progress, renewable energy still faces limitations. Energy storage is a major issue, as solar and wind power are not always available. Scientists are exploring better battery technologies to store excess energy for later use. With continued research and investment, renewable energy could become the main source of power in the future.",
    tags: ["science"],
    created_by: "ai_generated",
    review_status: "pending",
    questions: [
      { order_index: 1, type: "mcq", question_text: "What is the main goal of renewable energy research?", options: { A: "To increase fossil fuel use", B: "To improve and expand clean energy sources", C: "To stop scientific development", D: "To reduce electricity demand" }, correct_answer: "B", explanation: "Paragraph A explains the goal is to improve efficiency and reduce reliance on fossil fuels." },
      { order_index: 2, type: "mcq", question_text: "Why are new solar panels important?", options: { A: "They only work in sunny weather", B: "They are more expensive to produce", C: "They can capture sunlight more efficiently", D: "They replace wind energy" }, correct_answer: "C", explanation: "Paragraph B states that advanced panels capture sunlight more effectively." },
      { order_index: 3, type: "mcq", question_text: "What is a challenge of wind energy mentioned in the passage?", options: { A: "Low electricity production", B: "Lack of wind in all areas", C: "High installation costs", D: "Danger to solar panels" }, correct_answer: "C", explanation: "Paragraph C highlights the high cost of installation." },
      { order_index: 4, type: "tfng", question_text: "Renewable energy sources will run out quickly.", options: null, correct_answer: "FALSE", explanation: "Paragraph A states renewable energy does not run out like fossil fuels." },
      { order_index: 5, type: "tfng", question_text: "Offshore wind farms use stronger winds from the sea.", options: null, correct_answer: "TRUE", explanation: "Paragraph C explains offshore farms use stronger, more consistent winds." },
      { order_index: 6, type: "tfng", question_text: "All countries have already fully switched to renewable energy.", options: null, correct_answer: "NOT GIVEN", explanation: "The passage does not state that all countries have fully switched." },
      { order_index: 7, type: "matching", question_text: "Match paragraph B with its main idea", options: { A: "Challenges of energy storage", B: "Developments in solar technology", C: "Wind turbine design", D: "General introduction to renewable energy" }, correct_answer: "B", explanation: "Paragraph B focuses on improvements in solar panels." },
      { order_index: 8, type: "matching", question_text: "Match paragraph D with its main idea", options: { A: "Future challenges and solutions", B: "Wind energy benefits", C: "Solar panel costs", D: "Energy consumption trends" }, correct_answer: "A", explanation: "Paragraph D discusses limitations and future solutions like battery storage." },
    ],
  },
  {
    id: "e3a1b9c7-5d2f-4a8e-9b6c-1f7d2e4c8890",
    topic: "history",
    difficulty: "band_55_70",
    estimated_minutes: 7,
    passage_title: "The Silk Road and Its Influence",
    passage_text: "A. The Silk Road was an ancient network of trade routes connecting Asia, Europe, and parts of Africa. It was not a single road but a series of paths used by traders for over a thousand years. Goods such as silk, spices, and precious metals were transported across long distances. The route played a key role in shaping early global trade and cultural exchange.\n\nB. Trade along the Silk Road was not easy. Merchants faced dangerous conditions, including harsh weather, difficult terrain, and the risk of theft. Despite these challenges, trade continued because of the high value of goods. Cities located along the route became important centers of commerce and attracted travelers from different regions.\n\nC. In addition to goods, ideas and knowledge also spread along the Silk Road. Religions such as Buddhism and Islam moved between regions, influencing local cultures. Scientific knowledge, including mathematics and medicine, was shared among different civilizations. This exchange contributed to the development of societies along the route.\n\nD. Over time, the importance of the Silk Road declined. The rise of sea trade routes provided faster and more efficient ways to transport goods. As a result, many land routes were used less frequently. However, the historical impact of the Silk Road remains significant, as it connected distant parts of the world for centuries.",
    tags: ["history"],
    created_by: "ai_generated",
    review_status: "pending",
    questions: [
      { order_index: 1, type: "mcq", question_text: "What was the Silk Road mainly used for?", options: { A: "Military expansion", B: "Religious ceremonies", C: "Trade and exchange", D: "Agricultural development" }, correct_answer: "C", explanation: "Paragraph A explains that the Silk Road was a network of trade routes." },
      { order_index: 2, type: "mcq", question_text: "What challenge did traders face on the Silk Road?", options: { A: "Lack of goods", B: "Dangerous travel conditions", C: "Low demand for products", D: "Government restrictions" }, correct_answer: "B", explanation: "Paragraph B mentions harsh weather, terrain, and theft risks." },
      { order_index: 3, type: "mcq", question_text: "What spread along the Silk Road besides goods?", options: { A: "Only languages", B: "Only money", C: "Ideas and knowledge", D: "Only animals" }, correct_answer: "C", explanation: "Paragraph C describes the spread of religions and scientific knowledge." },
      { order_index: 4, type: "tfng", question_text: "The Silk Road was a single road connecting two cities.", options: null, correct_answer: "FALSE", explanation: "Paragraph A states it was a network of routes, not a single road." },
      { order_index: 5, type: "tfng", question_text: "Sea routes eventually replaced the Silk Road in importance.", options: null, correct_answer: "TRUE", explanation: "Paragraph D explains that sea trade became more efficient." },
      { order_index: 6, type: "tfng", question_text: "All traders on the Silk Road were from Europe.", options: null, correct_answer: "NOT GIVEN", explanation: "The passage does not specify that all traders were European." },
      { order_index: 7, type: "matching", question_text: "Match paragraph B with its main idea", options: { A: "Spread of culture and ideas", B: "Difficulties faced by traders", C: "Decline of trade routes", D: "Introduction to the Silk Road" }, correct_answer: "B", explanation: "Paragraph B focuses on the challenges of trading." },
      { order_index: 8, type: "matching", question_text: "Match paragraph C with its main idea", options: { A: "Economic decline", B: "Trade goods", C: "Cultural and knowledge exchange", D: "Geographical routes" }, correct_answer: "C", explanation: "Paragraph C discusses the spread of ideas and knowledge." },
    ],
  },
  {
    id: "c8b4d2e1-7a5f-4d9c-9e12-3f6a8b1c5520",
    topic: "society",
    difficulty: "band_55_70",
    estimated_minutes: 7,
    passage_title: "The Challenges of an Aging Population",
    passage_text: "A. Many countries around the world are experiencing an aging population. This means that the number of elderly people is increasing while the number of young people is decreasing. Advances in healthcare and living standards have allowed people to live longer, but this demographic shift creates new challenges for society.\n\nB. One major issue is the pressure on healthcare systems. Older people often require more medical care, which increases the demand for hospitals, doctors, and services. Governments must spend more money to support healthcare, which can lead to higher taxes or reduced funding in other areas.\n\nC. Another challenge is the impact on the workforce. As more people retire, there are fewer workers to support the economy. This can slow economic growth and create shortages in certain industries. Some countries have responded by encouraging older people to work longer or by accepting more immigrants to fill job gaps.\n\nD. Despite these challenges, an aging population can also bring benefits. Older individuals often have valuable experience and knowledge that can be shared with younger generations. In addition, they can contribute to society through volunteer work and community activities. Finding ways to support and include older people is important for building a balanced society.",
    tags: ["society"],
    created_by: "ai_generated",
    review_status: "pending",
    questions: [
      { order_index: 1, type: "mcq", question_text: "What is an aging population?", options: { A: "An increase in the number of young people", B: "A decrease in healthcare quality", C: "A rise in the number of elderly people", D: "A decline in living standards" }, correct_answer: "C", explanation: "Paragraph A explains that an aging population means more elderly people." },
      { order_index: 2, type: "mcq", question_text: "Why do healthcare systems face pressure?", options: { A: "Because fewer people are sick", B: "Because elderly people need more medical care", C: "Because hospitals are closing", D: "Because doctors are leaving the country" }, correct_answer: "B", explanation: "Paragraph B states that older people require more medical care." },
      { order_index: 3, type: "mcq", question_text: "How do some countries respond to workforce shortages?", options: { A: "By reducing retirement age", B: "By closing industries", C: "By encouraging longer working lives or immigration", D: "By limiting education" }, correct_answer: "C", explanation: "Paragraph C mentions encouraging older workers and accepting immigrants." },
      { order_index: 4, type: "tfng", question_text: "People are living longer due to improved healthcare.", options: null, correct_answer: "TRUE", explanation: "Paragraph A states that advances in healthcare have increased life expectancy." },
      { order_index: 5, type: "tfng", question_text: "An aging population always reduces government spending.", options: null, correct_answer: "FALSE", explanation: "Paragraph B shows that government spending increases due to healthcare needs." },
      { order_index: 6, type: "tfng", question_text: "All elderly people stop working completely after retirement.", options: null, correct_answer: "NOT GIVEN", explanation: "The passage does not state that all elderly people stop working." },
      { order_index: 7, type: "matching", question_text: "Match paragraph B with its main idea", options: { A: "Economic solutions", B: "Healthcare challenges", C: "Definition of aging population", D: "Benefits of elderly people" }, correct_answer: "B", explanation: "Paragraph B discusses pressure on healthcare systems." },
      { order_index: 8, type: "matching", question_text: "Match paragraph D with its main idea", options: { A: "Workforce decline", B: "Government spending", C: "Positive contributions of older people", D: "Population growth" }, correct_answer: "C", explanation: "Paragraph D highlights benefits and contributions of older people." },
    ],
  },
];

// ── Seed function ─────────────────────────────────────────────

async function seed() {
  const client = await pool.connect();
  let inserted = 0;
  let skipped = 0;

  try {
    await client.query("BEGIN");

    for (const p of PASSAGES) {
      // Idempotent check
      const existing = await client.query(
        "SELECT id FROM reading_passages WHERE id = $1",
        [p.id]
      );
      if (existing.rowCount > 0) {
        console.log(`\u23ED  "${p.passage_title}" already exists \u2014 skipping`);
        skipped++;
        continue;
      }

      // Insert passage
      await client.query(
        `INSERT INTO reading_passages (id, topic, difficulty, estimated_minutes, passage_title, passage_text, tags, created_by, review_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [p.id, p.topic, p.difficulty, p.estimated_minutes, p.passage_title, p.passage_text, p.tags, p.created_by, p.review_status]
      );

      // Insert questions
      for (const q of p.questions) {
        await client.query(
          `INSERT INTO reading_questions (passage_id, order_index, type, question_text, options, correct_answer, explanation)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [p.id, q.order_index, q.type, q.question_text, q.options ? JSON.stringify(q.options) : null, q.correct_answer, q.explanation]
        );
      }

      console.log(`\u2714  Inserted "${p.passage_title}" (${p.questions.length} questions)`);
      inserted++;
    }

    await client.query("COMMIT");
    console.log(`\n\u2705 Batch 2 seed completed: ${inserted} inserted, ${skipped} skipped`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("\n\u2716  Seed failed \u2014 rolled back:", err.message);
    process.exit(1);
  } finally {
    client.release();
  }
}

// ── Run ───────────────────────────────────────────────────────

seed()
  .then(() => pool.end())
  .catch((err) => {
    console.error("Fatal:", err.message);
    pool.end();
    process.exit(1);
  });
