const fs = require('fs');

const questions = [
  "What is a variable?",
];

async function runTests() {
  console.log('Testing 10 AI Tutor Questions...\n');
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    console.log(`[Q${i+1}] ${q}`);
    try {
      const res = await fetch('http://localhost:3001/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: q,
          subjectId: 'general',
          actionType: 'explain',
          sessionId: 'test-session',
          history: []
        })
      });
      const data = await res.json();
      
      if (!data.ok) {
        console.error(`❌ FAILED (API Error): ${data.error || 'Unknown error'}`);
        continue;
      }
      
      const content = data.content;
      console.log(`✅ SUCCESS (Type: ${data.type})`);
      console.log(`   Title: ${content.title}`);
      console.log(`   Body length: ${content.body ? content.body.length : 0} chars`);
      console.log(`   Points: ${content.points ? content.points.length : 0} items`);
      if (content.code) console.log(`   Code included!`);
      console.log('----------------------------------------------------');
    } catch (err) {
      console.error(`❌ FAILED (Network/Parse): ${err.message}`);
    }
  }
}

runTests();
