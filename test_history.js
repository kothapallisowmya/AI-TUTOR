// use global fetch

async function run() {
  console.log("Sending Q1...");
  const res1 = await fetch('http://localhost:3001/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: "What is a variable?",
      subjectId: 'java',
      actionType: 'explain',
      sessionId: 'test-session',
      history: []
    })
  });
  const data1 = await res1.json();
  if (!data1.ok) {
    console.error("Q1 failed", data1.error);
    return;
  }
  console.log("Q1 succeeded!");

  console.log("Sending Q2 with history...");
  const history = [
    { role: 'user', text: "What is a variable?" },
    { role: 'ai', text: data1.content.title }
  ];

  const res2 = await fetch('http://localhost:3001/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: "Explain inheritance.",
      subjectId: 'java',
      actionType: 'explain',
      sessionId: 'test-session',
      history
    })
  });
  const data2 = await res2.json();
  if (!data2.ok) {
    console.error("Q2 failed", data2.error);
    return;
  }
  console.log("Q2 succeeded!");
}
run();
