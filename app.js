/**
 * BTech AI Tutor — app.js
 * 
 * Architecture: All AI responses go through the `AIService` class.
 * To connect a real AI API, replace the methods in the `RealAIService`
 * class at the bottom of this file and set USE_REAL_AI = true.
 */

'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const USE_REAL_AI = true; // Enabled Gemini API Backend

// ─────────────────────────────────────────────────────────────────────────────
// BACKEND API HELPER
// All calls are fire-and-forget: errors are silently caught so the
// frontend always works even when the backend is offline.
// ─────────────────────────────────────────────────────────────────────────────

const API_BASE = 'http://localhost:3001/api';

const API = {
  getHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    const token = localStorage.getItem('btech_token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  },

  /** Check if the backend is running and DB is connected */
  async checkHealth() {
    try {
      const res  = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(3000) });
      return await res.json();
    } catch { return null; }
  },

  /** Save a completed quiz attempt to the database */
  async saveQuiz({ subject, subjectName, quizTitle, score, total, questions }) {
    try {
      const sessionId = getSessionId();
      await fetch(`${API_BASE}/quiz/save`, {
        method:  'POST',
        headers: this.getHeaders(),
        body:    JSON.stringify({ sessionId, subject, subjectName, quizTitle, score, total, questions }),
        signal:  AbortSignal.timeout(5000),
      });
    } catch { /* silent — quiz still worked locally */ }
  },

  /** Save a single chat message to the database */
  async saveMessage({ subject, subjectName, role, text, responseType, responseTitle, actionType }) {
    try {
      const sessionId = getSessionId();
      await fetch(`${API_BASE}/chat/save`, {
        method:  'POST',
        headers: this.getHeaders(),
        body:    JSON.stringify({ sessionId, subject, subjectName, role, text, responseType, responseTitle, actionType }),
        signal:  AbortSignal.timeout(5000),
      });
    } catch { /* silent */ }
  },

  /** Clear chat history in the database for a subject */
  async clearChat(subject) {
    try {
      const sessionId = getSessionId();
      const headers = this.getHeaders();
      delete headers['Content-Type']; // not needed for DELETE
      await fetch(`${API_BASE}/chat/history/${sessionId}?subject=${subject}`, {
        method: 'DELETE',
        headers,
        signal: AbortSignal.timeout(5000),
      });
    } catch { /* silent */ }
  },

  /** Auth Methods */
  async signup(name, email, password) {
    const sessionId = getSessionId();
    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, sessionId }),
    });
    return res.json();
  },

  async login(email, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return res.json();
  },

  async getMe() {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: this.getHeaders(),
    });
    return res.json();
  },

  async getStats() {
    const sessionId = getSessionId();
    const res = await fetch(`${API_BASE}/quiz/stats/${sessionId}`, {
      headers: this.getHeaders(),
    });
    return res.json();
  }
};

/** Get or create a persistent session ID stored in localStorage */
function getSessionId() {
  let id = localStorage.getItem('btech_session_id');
  if (!id) {
    // Generate a UUID-like ID without importing uuid
    id = 'sess-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem('btech_session_id', id);
  }
  return id;
}

// ─────────────────────────────────────────────────────────────────────────────
// SUBJECTS
// ─────────────────────────────────────────────────────────────────────────────

const SUBJECTS = [
  { id: 'java',    name: 'Java',                        emoji: '☕', color: '#f89820' },
  { id: 'python',  name: 'Python',                      emoji: '🐍', color: '#3572A5' },
  { id: 'dsa',     name: 'Data Structures & Algorithms', emoji: '🌲', color: '#00D4AA' },
  { id: 'dbms',    name: 'DBMS',                        emoji: '🗄️', color: '#9b59b6' },
  { id: 'os',      name: 'Operating Systems',           emoji: '🖥️', color: '#e74c3c' },
  { id: 'cn',      name: 'Computer Networks',           emoji: '🌐', color: '#3498db' },
  { id: 'se',      name: 'Software Engineering',        emoji: '⚙️', color: '#2ecc71' },
];

// ─────────────────────────────────────────────────────────────────────────────
// MOCK AI SERVICE
// ─────────────────────────────────────────────────────────────────────────────

class MockAIService {
  /**
   * Generate a response for a given question in the context of a subject.
   * @param {string} question - The student's question
   * @param {string} subjectId - The selected subject ID
   * @param {string} actionType - 'explain' | 'notes' | 'quiz' | 'example' | 'general'
   * @returns {Promise<{type: string, content: any}>}
   */
  async respond(question, subjectId, actionType) {
    // Simulate network delay
    await this._delay(1200 + Math.random() * 800);

    if (actionType === 'quiz') return this._generateQuiz(question, subjectId);
    if (actionType === 'notes') return this._generateNotes(question, subjectId);
    if (actionType === 'example') return this._generateCodeExample(question, subjectId);
    return this._generateExplanation(question, subjectId);
  }

  _delay(ms) { return new Promise(r => setTimeout(r, ms)); }

  // ── Explanation ──────────────────────────────────────────────────────────

  _generateExplanation(question, subjectId) {
    const subject = SUBJECTS.find(s => s.id === subjectId);
    const responses = MOCK_RESPONSES[subjectId] || MOCK_RESPONSES['general'];
    const resp = this._pickRelevant(responses.explanations, question);

    return {
      type: 'explanation',
      content: resp,
      subjectNote: resp.syllabusDependent || false,
    };
  }

  // ── Notes ────────────────────────────────────────────────────────────────

  _generateNotes(question, subjectId) {
    const responses = MOCK_RESPONSES[subjectId] || MOCK_RESPONSES['general'];
    const notes = this._pickRelevant(responses.notes, question);
    return { type: 'notes', content: notes };
  }

  // ── Code Example ─────────────────────────────────────────────────────────

  _generateCodeExample(question, subjectId) {
    const responses = MOCK_RESPONSES[subjectId] || MOCK_RESPONSES['general'];
    const example = this._pickRelevant(responses.examples, question);
    return { type: 'example', content: example };
  }

  // ── Quiz ─────────────────────────────────────────────────────────────────

  _generateQuiz(question, subjectId) {
    const responses = MOCK_RESPONSES[subjectId] || MOCK_RESPONSES['general'];
    const quiz = responses.quiz;
    return { type: 'quiz', content: quiz };
  }

  // ── Helper ───────────────────────────────────────────────────────────────

  _pickRelevant(array, question) {
    // Simple keyword-based selection; a real AI would do semantic matching
    const q = question.toLowerCase();
    for (const item of array) {
      if (item.keywords && item.keywords.some(kw => q.includes(kw))) return item;
    }
    return array[0]; // fallback to first
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// REAL AI SERVICE (placeholder — connect your API here)
// ─────────────────────────────────────────────────────────────────────────────

class RealAIService {
  async respond(question, subjectId, actionType) {
    const sessionId = getSessionId();
    // Get last 4 messages from history (excluding system messages)
    const history = state.messages
      .filter(m => m.role === 'user' || m.role === 'ai')
      .slice(-4)
      .map(m => ({
        role: m.role,
        text: m.role === 'user' ? m.text : (m.response?.content?.title || '')
      }));

    const res = await fetch(`${API_BASE}/ai/chat`, {
      method: 'POST',
      headers: API.getHeaders(),
      body: JSON.stringify({
        text: question,
        subjectId,
        actionType,
        sessionId,
        history
      }),
    });

    const data = await res.json();
    
    if (!data.ok) {
      throw new Error(data.error || 'Failed to fetch AI response');
    }

    return { type: data.type, content: data.content, subjectNote: data.content.note ? true : false };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MOCK RESPONSES DATABASE
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_RESPONSES = {

  // ── JAVA ──────────────────────────────────────────────────────────────────
  java: {
    explanations: [
      {
        keywords: ['oops', 'oop', 'object', 'class', 'inheritance', 'polymorphism', 'encapsulation', 'abstraction'],
        title: 'OOP Concepts in Java',
        body: `Java is built around <strong>Object-Oriented Programming (OOP)</strong>. There are 4 pillars you must know:`,
        points: [
          '<strong>Encapsulation</strong> — Wrapping data and methods into a single class, hiding internal details using access modifiers like <code>private</code>, <code>public</code>, <code>protected</code>.',
          '<strong>Inheritance</strong> — A child class inherits properties and methods from a parent class using the <code>extends</code> keyword.',
          '<strong>Polymorphism</strong> — One interface, many implementations. Achieved through method overloading (compile-time) and method overriding (runtime).',
          '<strong>Abstraction</strong> — Hiding implementation details and showing only necessary functionality using abstract classes or interfaces.',
        ],
        note: '💡 Remember: Java supports single inheritance but multiple interface implementation.',
        syllabusDependent: false,
      },
      {
        keywords: ['constructor', 'method', 'function', 'default'],
        title: 'Constructors in Java',
        body: `A <strong>constructor</strong> in Java is a special method used to initialize objects. It has the same name as the class and no return type.`,
        points: [
          '<strong>Default Constructor</strong> — Automatically provided by Java if no constructor is defined.',
          '<strong>Parameterized Constructor</strong> — Accepts arguments to initialize fields with custom values.',
          '<strong>Copy Constructor</strong> — Used to create a copy of an existing object (not built-in, must be written manually).',
        ],
        note: '💡 If you define any constructor, Java will NOT auto-generate the default one.',
        syllabusDependent: false,
      },
      {
        keywords: ['exception', 'error', 'try', 'catch', 'throw', 'finally', 'handle'],
        title: 'Exception Handling in Java',
        body: `<strong>Exception Handling</strong> in Java allows you to gracefully handle runtime errors using <code>try-catch-finally</code>.`,
        points: [
          '<code>try</code> — Block where risky code is placed.',
          '<code>catch</code> — Catches and handles the exception.',
          '<code>finally</code> — Always executes, used for cleanup (closing files, DB connections).',
          '<code>throw</code> — Manually throw an exception.',
          '<code>throws</code> — Declares exceptions a method can throw.',
        ],
        note: '💡 Checked exceptions must be handled at compile time; Unchecked exceptions (like NullPointerException) occur at runtime.',
        syllabusDependent: false,
      },
      {
        keywords: [],
        title: 'Java Basics',
        body: `Java is a <strong>platform-independent, object-oriented, strongly-typed</strong> programming language. Here are key concepts you'll need in BTech:`,
        points: [
          '<strong>JVM</strong> (Java Virtual Machine) — Executes bytecode, making Java platform-independent (Write Once, Run Anywhere).',
          '<strong>JDK</strong> — Java Development Kit; includes compiler, JRE, and tools.',
          '<strong>JRE</strong> — Java Runtime Environment; required to run Java applications.',
          'Java programs start from the <code>public static void main(String[] args)</code> method.',
        ],
        tip: '📘 Tip: Learn the difference between JDK, JRE, and JVM — it\'s a common exam question!',
        syllabusDependent: false,
      },
    ],
    notes: [
      {
        keywords: ['oops', 'oop', 'object', 'class'],
        title: 'Short Notes: OOP in Java',
        sections: [
          { heading: '4 Pillars of OOP', items: ['Encapsulation — data hiding using access modifiers', 'Inheritance — reusing code via extends', 'Polymorphism — method overloading & overriding', 'Abstraction — abstract classes & interfaces'] },
          { heading: 'Key Keywords', items: ['class, object, new, this, super', 'extends (inheritance), implements (interface)', 'abstract, interface, final, static'] },
          { heading: 'Important Facts', items: ['Java supports single inheritance only', 'Multiple inheritance via interfaces', 'Every class extends Object by default'] },
        ],
      },
      {
        keywords: [],
        title: 'Short Notes: Java Fundamentals',
        sections: [
          { heading: 'Data Types', items: ['Primitive: byte, short, int, long, float, double, char, boolean', 'Non-primitive: String, Array, Class, Interface'] },
          { heading: 'Access Modifiers', items: ['public — accessible everywhere', 'private — only within class', 'protected — within package and subclasses', 'default — within package only'] },
          { heading: 'Control Structures', items: ['if-else, switch-case', 'for, while, do-while loops', 'break, continue, return'] },
        ],
      },
    ],
    examples: [
      {
        keywords: ['oops', 'oop', 'class', 'inheritance', 'object'],
        title: 'OOP Example in Java',
        description: 'A simple example demonstrating Inheritance and Polymorphism:',
        code: `// Parent class
class Animal {
    String name;

    Animal(String name) {
        this.name = name;
    }

    void makeSound() {
        System.out.println(name + " makes a sound");
    }
}

// Child class (Inheritance)
class Dog extends Animal {
    Dog(String name) {
        super(name); // calls parent constructor
    }

    // Method Overriding (Runtime Polymorphism)
    @Override
    void makeSound() {
        System.out.println(name + " says: Woof!");
    }
}

// Main class
public class Main {
    public static void main(String[] args) {
        Animal a = new Dog("Buddy"); // polymorphism
        a.makeSound(); // Output: Buddy says: Woof!
    }
}`,
        language: 'Java',
        output: 'Buddy says: Woof!',
      },
      {
        keywords: [],
        title: 'Hello World in Java',
        description: 'The most basic Java program — your starting point:',
        code: `public class HelloWorld {
    public static void main(String[] args) {
        System.out.println("Hello, BTech World!");
        
        // Variables
        int year = 2024;
        String branch = "Computer Science";
        
        System.out.println("Year: " + year);
        System.out.println("Branch: " + branch);
    }
}`,
        language: 'Java',
        output: `Hello, BTech World!
Year: 2024
Branch: Computer Science`,
      },
    ],
    quiz: {
      title: 'Java MCQ Quiz',
      questions: [
        {
          question: 'Which concept allows a child class to inherit properties from a parent class in Java?',
          options: ['Encapsulation', 'Polymorphism', 'Inheritance', 'Abstraction'],
          answer: 2,
          explanation: 'Inheritance allows a class to acquire properties and behaviors of another class using the "extends" keyword.',
        },
        {
          question: 'What does JVM stand for?',
          options: ['Java Virtual Machine', 'Java Variable Manager', 'Java Visual Module', 'Java Version Manager'],
          answer: 0,
          explanation: 'JVM (Java Virtual Machine) is responsible for executing Java bytecode, making Java platform-independent.',
        },
        {
          question: 'Which access modifier makes a member accessible only within its own class?',
          options: ['public', 'protected', 'default', 'private'],
          answer: 3,
          explanation: '"private" restricts access to only within the same class — the most restrictive modifier.',
        },
        {
          question: 'What is the correct signature for the main method in Java?',
          options: ['public void main(String args)', 'public static void main(String[] args)', 'static public main()', 'void main(String args[])'],
          answer: 1,
          explanation: 'The main method must be "public static void main(String[] args)" — Java\'s entry point for execution.',
        },
        {
          question: 'Method overloading in Java is an example of which type of polymorphism?',
          options: ['Runtime polymorphism', 'Dynamic polymorphism', 'Compile-time polymorphism', 'Abstract polymorphism'],
          answer: 2,
          explanation: 'Method overloading is resolved at compile time, hence it is called compile-time (or static) polymorphism.',
        },
      ],
    },
  },

  // ── PYTHON ────────────────────────────────────────────────────────────────
  python: {
    explanations: [
      {
        keywords: ['list', 'tuple', 'dict', 'set', 'data structure', 'collection'],
        title: 'Python Data Structures',
        body: `Python has 4 built-in collection data types — a very common BTech exam topic:`,
        points: [
          '<strong>List</strong> — Ordered, mutable, allows duplicates. <code>[1, 2, 3]</code>',
          '<strong>Tuple</strong> — Ordered, immutable, allows duplicates. <code>(1, 2, 3)</code>',
          '<strong>Set</strong> — Unordered, mutable, NO duplicates. <code>{1, 2, 3}</code>',
          '<strong>Dictionary</strong> — Key-value pairs, ordered (Python 3.7+), mutable. <code>{"a": 1}</code>',
        ],
        note: '💡 Remember: Tuples are faster than lists because they are immutable.',
        syllabusDependent: false,
      },
      {
        keywords: [],
        title: 'Python Fundamentals',
        body: `Python is a <strong>high-level, interpreted, dynamically-typed</strong> language widely used in BTech for programming labs, AI/ML, and scripting.`,
        points: [
          'No need to declare variable types — Python infers them automatically.',
          'Indentation is mandatory — Python uses indentation instead of curly braces.',
          'Python supports multiple programming paradigms: OOP, functional, procedural.',
          'Extensive standard library: <code>os</code>, <code>sys</code>, <code>math</code>, <code>random</code>, etc.',
        ],
        note: '💡 Python 3.x is the current standard. Avoid Python 2.x.',
        syllabusDependent: false,
      },
    ],
    notes: [
      {
        keywords: [],
        title: 'Short Notes: Python Essentials',
        sections: [
          { heading: 'Basic Syntax', items: ['print(), input(), type(), len()', 'if-elif-else, for, while, break, continue', 'def for function definition, lambda for anonymous functions'] },
          { heading: 'Collections', items: ['List: mutable, ordered — []', 'Tuple: immutable, ordered — ()', 'Set: no duplicates — {}', 'Dict: key-value — {"key": val}'] },
          { heading: 'OOP in Python', items: ['class keyword, __init__ constructor', 'self refers to current instance', 'Inheritance using class Child(Parent)', '__str__, __repr__ dunder methods'] },
        ],
      },
    ],
    examples: [
      {
        keywords: [],
        title: 'Python List Operations',
        description: 'Common list operations you should know for lab exams:',
        code: `# Creating and manipulating lists
fruits = ["apple", "banana", "cherry"]

# Add elements
fruits.append("mango")          # add at end
fruits.insert(1, "orange")      # add at index

# Remove elements
fruits.remove("banana")         # remove by value
popped = fruits.pop()           # remove last

# Iteration
for fruit in fruits:
    print(fruit)

# List comprehension (very useful!)
squares = [x**2 for x in range(1, 6)]
print(squares)  # [1, 4, 9, 16, 25]

# Slicing
nums = [0, 1, 2, 3, 4, 5]
print(nums[1:4])   # [1, 2, 3]
print(nums[::-1])  # reversed`,
        language: 'Python',
        output: `apple\norange\ncherry\n[1, 4, 9, 16, 25]`,
      },
    ],
    quiz: {
      title: 'Python MCQ Quiz',
      questions: [
        {
          question: 'Which of the following is immutable in Python?',
          options: ['List', 'Set', 'Dictionary', 'Tuple'],
          answer: 3,
          explanation: 'Tuples are immutable — once created, their elements cannot be changed.',
        },
        {
          question: 'What is the output of: print(type([]))?',
          options: ["<class 'list'>", "<class 'array'>", "<class 'tuple'>", "<type 'list'>"],
          answer: 0,
          explanation: 'In Python 3, type([]) returns <class \'list\'> since lists are of type list.',
        },
        {
          question: 'Which keyword is used to define a function in Python?',
          options: ['function', 'func', 'def', 'define'],
          answer: 2,
          explanation: 'The "def" keyword is used to define functions in Python.',
        },
        {
          question: 'What does the "self" parameter in Python class methods refer to?',
          options: ['The class itself', 'The current instance of the class', 'A global variable', 'The parent class'],
          answer: 1,
          explanation: '"self" refers to the current object instance, allowing access to instance attributes and methods.',
        },
        {
          question: 'What will len({"a":1, "b":2, "c":3}) return?',
          options: ['6', '3', '2', 'Error'],
          answer: 1,
          explanation: 'len() on a dictionary returns the number of key-value pairs. This dict has 3 pairs.',
        },
      ],
    },
  },

  // ── DSA ───────────────────────────────────────────────────────────────────
  dsa: {
    explanations: [
      {
        keywords: ['array', 'stack', 'queue', 'linked list', 'tree', 'graph', 'hash'],
        title: 'Data Structures Overview',
        body: `<strong>Data Structures</strong> are ways to organize and store data. Choosing the right one can drastically improve your program's efficiency.`,
        points: [
          '<strong>Array</strong> — Fixed size, contiguous memory, O(1) access by index.',
          '<strong>Linked List</strong> — Dynamic size, non-contiguous memory, O(n) access.',
          '<strong>Stack</strong> — LIFO (Last In, First Out). Operations: push, pop, peek. Used in recursion, undo operations.',
          '<strong>Queue</strong> — FIFO (First In, First Out). Operations: enqueue, dequeue. Used in scheduling, BFS.',
          '<strong>Tree</strong> — Hierarchical structure. BST, AVL, Heap are common types.',
          '<strong>Graph</strong> — Nodes (vertices) connected by edges. Used in maps, networks.',
          '<strong>Hash Table</strong> — Key-value mapping for O(1) average lookup.',
        ],
        note: '💡 For exams: Focus on time complexities — O(1), O(log n), O(n), O(n log n), O(n²).',
        syllabusDependent: true,
      },
      {
        keywords: ['sort', 'bubble', 'merge', 'quick', 'insertion', 'selection', 'algorithm', 'sorting'],
        title: 'Sorting Algorithms',
        body: `Sorting algorithms arrange data in order. Here's a quick comparison for your exams:`,
        points: [
          '<strong>Bubble Sort</strong> — O(n²) — Simple, compares adjacent elements. Best for small datasets.',
          '<strong>Selection Sort</strong> — O(n²) — Finds minimum and places at correct position.',
          '<strong>Insertion Sort</strong> — O(n²) worst, O(n) best — Efficient for nearly sorted data.',
          '<strong>Merge Sort</strong> — O(n log n) — Divide and conquer, stable sort, requires extra space.',
          '<strong>Quick Sort</strong> — O(n log n) average — Fastest in practice, in-place, not stable.',
        ],
        note: '💡 Merge Sort is preferred when stability matters. Quick Sort is preferred for average-case performance.',
        syllabusDependent: true,
      },
      {
        keywords: [],
        title: 'Big-O Notation',
        body: `<strong>Big-O notation</strong> describes the time/space complexity of an algorithm as the input size grows. It's essential for DSA exams!`,
        points: [
          '<strong>O(1)</strong> — Constant time: accessing an array element.',
          '<strong>O(log n)</strong> — Logarithmic: Binary Search.',
          '<strong>O(n)</strong> — Linear: Linear Search, traversing a list.',
          '<strong>O(n log n)</strong> — Merge Sort, Quick Sort (avg).',
          '<strong>O(n²)</strong> — Quadratic: Bubble Sort, nested loops.',
          '<strong>O(2ⁿ)</strong> — Exponential: Recursive fibonacci (naive).',
        ],
        note: '💡 Always analyze both Time Complexity and Space Complexity.',
        syllabusDependent: false,
      },
    ],
    notes: [
      {
        keywords: [],
        title: 'Short Notes: DSA Quick Reference',
        sections: [
          { heading: 'Linear Structures', items: ['Array: O(1) access, O(n) insert/delete', 'LinkedList: O(n) access, O(1) insert at head', 'Stack: LIFO — push/pop O(1)', 'Queue: FIFO — enqueue/dequeue O(1)'] },
          { heading: 'Sorting Complexities', items: ['Bubble: O(n²) | Insertion: O(n²) | Selection: O(n²)', 'Merge Sort: O(n log n) — stable', 'Quick Sort: O(n log n) avg, O(n²) worst', 'Heap Sort: O(n log n) — not stable'] },
          { heading: 'Tree Traversals', items: ['Inorder: Left → Root → Right', 'Preorder: Root → Left → Right', 'Postorder: Left → Right → Root', 'Level Order: BFS using Queue'] },
        ],
      },
    ],
    examples: [
      {
        keywords: ['sort', 'bubble'],
        title: 'Bubble Sort in Java',
        description: 'Step-by-step implementation of Bubble Sort:',
        code: `public class BubbleSort {
    static void bubbleSort(int[] arr) {
        int n = arr.length;
        
        for (int i = 0; i < n - 1; i++) {
            for (int j = 0; j < n - i - 1; j++) {
                // Swap if current element is greater than next
                if (arr[j] > arr[j + 1]) {
                    int temp = arr[j];
                    arr[j] = arr[j + 1];
                    arr[j + 1] = temp;
                }
            }
        }
    }

    public static void main(String[] args) {
        int[] arr = {64, 34, 25, 12, 22, 11, 90};
        bubbleSort(arr);
        
        System.out.print("Sorted: ");
        for (int x : arr) System.out.print(x + " ");
    }
}`,
        language: 'Java',
        output: 'Sorted: 11 12 22 25 34 64 90',
      },
      {
        keywords: [],
        title: 'Binary Search',
        description: 'Efficient search in a sorted array — O(log n):',
        code: `def binary_search(arr, target):
    left, right = 0, len(arr) - 1
    
    while left <= right:
        mid = (left + right) // 2
        
        if arr[mid] == target:
            return mid        # Found!
        elif arr[mid] < target:
            left = mid + 1    # Search right half
        else:
            right = mid - 1   # Search left half
    
    return -1  # Not found

# Example usage
arr = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91]
result = binary_search(arr, 23)
print(f"Found at index: {result}")  # Found at index: 5`,
        language: 'Python',
        output: 'Found at index: 5',
      },
    ],
    quiz: {
      title: 'DSA MCQ Quiz',
      questions: [
        {
          question: 'Which data structure follows the LIFO principle?',
          options: ['Queue', 'Stack', 'Linked List', 'Tree'],
          answer: 1,
          explanation: 'Stack follows LIFO (Last In, First Out). The last element pushed is the first to be popped.',
        },
        {
          question: 'What is the time complexity of Binary Search?',
          options: ['O(n)', 'O(n²)', 'O(log n)', 'O(n log n)'],
          answer: 2,
          explanation: 'Binary Search has O(log n) time complexity as it halves the search space with each step.',
        },
        {
          question: 'Which sorting algorithm has the best average-case time complexity?',
          options: ['Bubble Sort', 'Selection Sort', 'Insertion Sort', 'Quick Sort'],
          answer: 3,
          explanation: 'Quick Sort has O(n log n) average case and is generally the fastest in practice.',
        },
        {
          question: 'In a Binary Search Tree (BST), elements in the left subtree are:',
          options: ['Greater than root', 'Equal to root', 'Less than root', 'Random order'],
          answer: 2,
          explanation: 'In a BST, left subtree contains nodes with values less than the root, right subtree contains greater values.',
        },
        {
          question: 'Which traversal visits nodes in: Left → Root → Right order?',
          options: ['Preorder', 'Inorder', 'Postorder', 'Level Order'],
          answer: 1,
          explanation: 'Inorder traversal (Left → Root → Right) gives sorted output for a BST.',
        },
      ],
    },
  },

  // ── DBMS ──────────────────────────────────────────────────────────────────
  dbms: {
    explanations: [
      {
        keywords: ['normalization', 'normal form', '1nf', '2nf', '3nf', 'bcnf'],
        title: 'Normalization in DBMS',
        body: `<strong>Normalization</strong> is the process of organizing a database to reduce data redundancy and improve data integrity.`,
        points: [
          '<strong>1NF (First Normal Form)</strong> — Each column must have atomic (indivisible) values. No repeating groups.',
          '<strong>2NF (Second Normal Form)</strong> — Must be in 1NF + No partial dependency (non-key attributes must depend on the full primary key).',
          '<strong>3NF (Third Normal Form)</strong> — Must be in 2NF + No transitive dependency (non-key attributes must not depend on other non-key attributes).',
          '<strong>BCNF (Boyce-Codd Normal Form)</strong> — Stricter version of 3NF. For every functional dependency X → Y, X must be a superkey.',
        ],
        note: '💡 For most practical purposes, achieving 3NF is sufficient. BCNF is stricter.',
        syllabusDependent: true,
      },
      {
        keywords: ['sql', 'query', 'select', 'join', 'where', 'group', 'order'],
        title: 'SQL Fundamentals',
        body: `<strong>SQL (Structured Query Language)</strong> is used to interact with relational databases. Here are the key commands:`,
        points: [
          '<strong>DDL</strong> (Data Definition Language): CREATE, ALTER, DROP, TRUNCATE.',
          '<strong>DML</strong> (Data Manipulation Language): SELECT, INSERT, UPDATE, DELETE.',
          '<strong>DCL</strong> (Data Control Language): GRANT, REVOKE.',
          '<strong>TCL</strong> (Transaction Control Language): COMMIT, ROLLBACK, SAVEPOINT.',
        ],
        note: '💡 SELECT is the most used SQL command. Master JOINs (INNER, LEFT, RIGHT, FULL OUTER) for complex queries.',
        syllabusDependent: false,
      },
      {
        keywords: [],
        title: 'DBMS Key Concepts',
        body: `A <strong>Database Management System (DBMS)</strong> is software that manages databases. Key concepts for BTech exams:`,
        points: [
          '<strong>ACID Properties</strong> — Atomicity, Consistency, Isolation, Durability (for transactions).',
          '<strong>ER Diagram</strong> — Entity-Relationship Diagram: visual representation of database schema.',
          '<strong>Keys</strong>: Primary Key (unique identifier), Foreign Key (links tables), Candidate Key, Super Key.',
          '<strong>Indexes</strong> — Improve query performance; trade-off is additional storage.',
          '<strong>Views</strong> — Virtual tables derived from SQL queries.',
        ],
        note: '💡 ACID properties are critical for transaction management — a very common exam topic!',
        syllabusDependent: true,
      },
    ],
    notes: [
      {
        keywords: [],
        title: 'Short Notes: DBMS Quick Reference',
        sections: [
          { heading: 'ACID Properties', items: ['Atomicity: All or nothing', 'Consistency: DB remains in valid state', 'Isolation: Transactions are independent', 'Durability: Committed data persists'] },
          { heading: 'SQL Commands', items: ['DDL: CREATE, ALTER, DROP', 'DML: SELECT, INSERT, UPDATE, DELETE', 'DCL: GRANT, REVOKE', 'TCL: COMMIT, ROLLBACK'] },
          { heading: 'Normalization Forms', items: ['1NF: Atomic values, no repeating groups', '2NF: No partial dependency', '3NF: No transitive dependency', 'BCNF: Every determinant is a superkey'] },
        ],
      },
    ],
    examples: [
      {
        keywords: [],
        title: 'SQL JOIN Example',
        description: 'Demonstrating INNER JOIN to combine data from two tables:',
        code: `-- Create Tables
CREATE TABLE Students (
    sid INT PRIMARY KEY,
    name VARCHAR(50),
    dept VARCHAR(30)
);

CREATE TABLE Courses (
    cid INT PRIMARY KEY,
    sid INT,
    course_name VARCHAR(50),
    FOREIGN KEY (sid) REFERENCES Students(sid)
);

-- Insert Sample Data
INSERT INTO Students VALUES (1, 'Alice', 'CSE');
INSERT INTO Students VALUES (2, 'Bob', 'ECE');
INSERT INTO Courses VALUES (101, 1, 'Database Systems');
INSERT INTO Courses VALUES (102, 1, 'Operating Systems');
INSERT INTO Courses VALUES (103, 2, 'Digital Circuits');

-- INNER JOIN: Get student names with their courses
SELECT s.name, c.course_name
FROM Students s
INNER JOIN Courses c ON s.sid = c.sid;`,
        language: 'SQL',
        output: `Alice | Database Systems
Alice | Operating Systems
Bob   | Digital Circuits`,
      },
    ],
    quiz: {
      title: 'DBMS MCQ Quiz',
      questions: [
        {
          question: 'Which normal form eliminates partial dependencies?',
          options: ['1NF', '2NF', '3NF', 'BCNF'],
          answer: 1,
          explanation: '2NF eliminates partial dependencies — non-key attributes must depend on the entire primary key.',
        },
        {
          question: 'What does ACID stand for in DBMS?',
          options: ['Atomicity, Consistency, Isolation, Durability', 'Atomicity, Concurrency, Integrity, Dependency', 'Access, Consistency, Isolation, Durability', 'Atomicity, Consistency, Integration, Data'],
          answer: 0,
          explanation: 'ACID = Atomicity, Consistency, Isolation, Durability — properties that guarantee reliable database transactions.',
        },
        {
          question: 'Which SQL command is used to retrieve data from a database?',
          options: ['FETCH', 'GET', 'SELECT', 'RETRIEVE'],
          answer: 2,
          explanation: 'SELECT is the DML command used to query and retrieve data from database tables.',
        },
        {
          question: 'A foreign key in a table refers to the ___ of another table.',
          options: ['Foreign key', 'Primary key', 'Candidate key', 'Super key'],
          answer: 1,
          explanation: 'A foreign key in one table references the primary key of another table, establishing a link between them.',
        },
        {
          question: 'Which JOIN returns all rows from the left table and matching rows from the right table?',
          options: ['INNER JOIN', 'RIGHT JOIN', 'LEFT JOIN', 'FULL OUTER JOIN'],
          answer: 2,
          explanation: 'LEFT JOIN returns all rows from the left table and matching rows from the right table. Non-matching rows show NULL.',
        },
      ],
    },
  },

  // ── OS ────────────────────────────────────────────────────────────────────
  os: {
    explanations: [
      {
        keywords: ['process', 'thread', 'scheduling', 'cpu', 'fcfs', 'sjf', 'round robin'],
        title: 'Process Scheduling in OS',
        body: `<strong>CPU Scheduling</strong> determines which process runs on the CPU next. Key algorithms:`,
        points: [
          '<strong>FCFS</strong> (First Come First Serve) — Simplest. Processes executed in arrival order. Can cause convoy effect.',
          '<strong>SJF</strong> (Shortest Job First) — Minimum average waiting time. Can cause starvation.',
          '<strong>Round Robin</strong> — Time quantum given to each process. Fair, good for time-sharing systems.',
          '<strong>Priority Scheduling</strong> — Highest priority runs first. Can cause starvation (solved by aging).',
          '<strong>SRTF</strong> — Preemptive SJF. Remaining time of running process compared to new arrivals.',
        ],
        note: '💡 Round Robin is used in modern OS. Time quantum selection is critical — too small causes context switching overhead.',
        syllabusDependent: true,
      },
      {
        keywords: ['deadlock', 'prevention', 'detection', 'avoidance', 'banker'],
        title: 'Deadlock in Operating Systems',
        body: `<strong>Deadlock</strong> occurs when a set of processes are blocked because each is waiting for a resource held by another.`,
        points: [
          '<strong>4 Necessary Conditions</strong> (Coffman): Mutual Exclusion, Hold and Wait, No Preemption, Circular Wait.',
          '<strong>Deadlock Prevention</strong> — Eliminate one of the 4 conditions.',
          '<strong>Deadlock Avoidance</strong> — Banker\'s Algorithm: only allocate if system stays in safe state.',
          '<strong>Deadlock Detection & Recovery</strong> — Allow deadlock, detect it using wait-for graph, recover by killing processes or preempting resources.',
        ],
        note: '💡 Banker\'s Algorithm is a common exam question. Understand safe state vs unsafe state.',
        syllabusDependent: true,
      },
      {
        keywords: [],
        title: 'Operating System Basics',
        body: `An <strong>Operating System (OS)</strong> is system software that manages hardware and software resources. Key concepts:`,
        points: [
          '<strong>Process Management</strong> — Creating, scheduling, and terminating processes.',
          '<strong>Memory Management</strong> — Allocating and deallocating memory to processes. Paging, Segmentation.',
          '<strong>File System</strong> — Managing files and directories. FAT, NTFS, ext4.',
          '<strong>I/O Management</strong> — Managing input/output devices and their drivers.',
          '<strong>Security</strong> — Authentication, authorization, protection mechanisms.',
        ],
        note: '💡 OS types: Batch, Time-sharing, Real-time, Distributed, Embedded.',
        syllabusDependent: false,
      },
    ],
    notes: [
      {
        keywords: [],
        title: 'Short Notes: Operating Systems',
        sections: [
          { heading: 'Process States', items: ['New → Ready → Running → Waiting → Terminated', 'Context Switch: saving/restoring PCB', 'PCB contains: PID, state, PC, registers, memory info'] },
          { heading: 'Memory Management', items: ['Paging: fixed-size frames (no external fragmentation)', 'Segmentation: variable-size segments', 'Virtual Memory: use disk as extended RAM', 'Page Replacement: FIFO, LRU, Optimal'] },
          { heading: 'Scheduling Metrics', items: ['Arrival Time, Burst Time, Completion Time', 'Turnaround Time = CT - AT', 'Waiting Time = TAT - Burst Time', 'Response Time = First CPU time - AT'] },
        ],
      },
    ],
    examples: [
      {
        keywords: [],
        title: 'FCFS Scheduling Calculation',
        description: 'Step-by-step FCFS (First Come First Serve) scheduling example:',
        code: `Process | Arrival | Burst | Start | Finish | TAT | WT
--------|---------|-------|-------|--------|-----|----
  P1    |    0    |   5   |   0   |   5    |  5  |  0
  P2    |    1    |   3   |   5   |   8    |  7  |  4
  P3    |    2    |   8   |   8   |  16    | 14  |  6
  P4    |    3    |   2   |  16   |  18    | 15  | 13

Average Turnaround Time = (5 + 7 + 14 + 15) / 4 = 10.25
Average Waiting Time    = (0 + 4 + 6 + 13) / 4  = 5.75

Gantt Chart:
|  P1  |  P2  |       P3      | P4 |
0      5      8               16   18`,
        language: 'Text',
        output: 'Avg TAT = 10.25 | Avg WT = 5.75',
      },
    ],
    quiz: {
      title: 'Operating Systems MCQ Quiz',
      questions: [
        {
          question: 'Which of the following is NOT a necessary condition for deadlock?',
          options: ['Mutual Exclusion', 'Hold and Wait', 'Preemption', 'Circular Wait'],
          answer: 2,
          explanation: '"No Preemption" (not Preemption) is one of the 4 Coffman conditions. Preemption itself would prevent deadlock.',
        },
        {
          question: 'In Round Robin scheduling, what determines when a process is preempted?',
          options: ['Priority value', 'Time quantum', 'Burst time', 'Arrival time'],
          answer: 1,
          explanation: 'Round Robin uses a time quantum. A process runs for that duration and is preempted if not finished, going to the back of the queue.',
        },
        {
          question: 'What does PCB stand for in OS?',
          options: ['Program Control Block', 'Process Control Block', 'Peripheral Control Bus', 'Processor Cache Block'],
          answer: 1,
          explanation: 'PCB (Process Control Block) stores all information about a process: PID, state, PC, registers, memory maps, etc.',
        },
        {
          question: 'Which page replacement algorithm has the lowest page fault rate theoretically?',
          options: ['FIFO', 'LRU', 'Optimal', 'Clock'],
          answer: 2,
          explanation: 'The Optimal (OPT) algorithm has the lowest page faults but requires future knowledge — used as a benchmark.',
        },
        {
          question: 'Turnaround Time = ?',
          options: ['Completion Time - Burst Time', 'Completion Time - Arrival Time', 'Waiting Time + Burst Time', 'Both B and C'],
          answer: 3,
          explanation: 'TAT = CT - AT = WT + BT. Both formulas are equivalent and correct.',
        },
      ],
    },
  },

  // ── CN ────────────────────────────────────────────────────────────────────
  cn: {
    explanations: [
      {
        keywords: ['osi', 'layer', 'model', 'tcp/ip', 'protocol'],
        title: 'OSI Model (7 Layers)',
        body: `The <strong>OSI (Open Systems Interconnection)</strong> model defines 7 layers for network communication. Remember with: <em>"All People Seem To Need Data Processing"</em>`,
        points: [
          '<strong>7. Application</strong> — User interface. HTTP, FTP, SMTP, DNS.',
          '<strong>6. Presentation</strong> — Data formatting, encryption, compression. SSL/TLS.',
          '<strong>5. Session</strong> — Managing sessions between applications.',
          '<strong>4. Transport</strong> — Reliable delivery. TCP (reliable), UDP (unreliable).',
          '<strong>3. Network</strong> — Routing, IP addressing. IP, ICMP, routers.',
          '<strong>2. Data Link</strong> — MAC addressing, error detection. Ethernet, switches.',
          '<strong>1. Physical</strong> — Physical transmission of bits. Cables, hubs, NIC.',
        ],
        note: '💡 Mnemonic: "All People Seem To Need Data Processing" (A P S T N D P, top to bottom).',
        syllabusDependent: true,
      },
      {
        keywords: ['tcp', 'udp', 'ip', 'http', 'protocol', 'transport'],
        title: 'TCP vs UDP',
        body: `<strong>TCP</strong> and <strong>UDP</strong> are the two main transport layer protocols. Key differences:`,
        points: [
          '<strong>TCP</strong> (Transmission Control Protocol): Connection-oriented, reliable, flow control, error correction, ordered delivery. Used for HTTP, FTP, Email.',
          '<strong>UDP</strong> (User Datagram Protocol): Connectionless, unreliable, faster, no error correction. Used for DNS, Video Streaming, Gaming, VoIP.',
          '<strong>3-Way Handshake (TCP)</strong>: SYN → SYN-ACK → ACK. Establishes reliable connection before data transfer.',
          '<strong>Use TCP when</strong>: Accuracy matters. <strong>Use UDP when</strong>: Speed matters.',
        ],
        note: '💡 HTTP uses TCP. DNS uses UDP (and switches to TCP for large responses).',
        syllabusDependent: false,
      },
      {
        keywords: [],
        title: 'Computer Networks Fundamentals',
        body: `<strong>Computer Networks</strong> connect devices to share resources and communicate. Key concepts:`,
        points: [
          '<strong>IP Address</strong> — Unique identifier for each device. IPv4 (32-bit), IPv6 (128-bit).',
          '<strong>Subnet Mask</strong> — Divides IP into network and host portions.',
          '<strong>DNS</strong> — Domain Name System: converts domain names to IP addresses.',
          '<strong>DHCP</strong> — Automatically assigns IP addresses to devices.',
          '<strong>MAC Address</strong> — Hardware address of a network interface card (NIC).',
        ],
        note: '💡 Know the difference between IP address (logical, network layer) and MAC address (physical, data link layer).',
        syllabusDependent: false,
      },
    ],
    notes: [
      {
        keywords: [],
        title: 'Short Notes: Computer Networks',
        sections: [
          { heading: 'OSI Layers (mnemonic: All People Seem To Need Data Processing)', items: ['7-Application, 6-Presentation, 5-Session', '4-Transport (TCP/UDP), 3-Network (IP)', '2-Data Link (MAC), 1-Physical'] },
          { heading: 'TCP/IP Protocols', items: ['HTTP/HTTPS: web browsing (80/443)', 'FTP: file transfer (20/21)', 'SMTP/POP3/IMAP: email', 'DNS: name resolution (53)', 'DHCP: auto IP assignment (67/68)'] },
          { heading: 'Key Concepts', items: ['Bandwidth vs Throughput', 'Latency and Jitter', 'Routing: RIP, OSPF, BGP', 'Subnetting: CIDR notation', 'NAT: Network Address Translation'] },
        ],
      },
    ],
    examples: [
      {
        keywords: [],
        title: 'Subnetting Example',
        description: 'How to calculate subnet details from a CIDR notation:',
        code: `IP Address:  192.168.1.0/24

Subnet Mask:  255.255.255.0  (24 bits = 3 bytes = 255.255.255)
Network ID:   192.168.1.0
Broadcast:    192.168.1.255
Host Range:   192.168.1.1 — 192.168.1.254
Total Hosts:  2^(32-24) - 2 = 254

─────────────────────────────────────────────
Splitting into 4 subnets (/26):

Subnet 1:  192.168.1.0/26   Hosts: .1 - .62
Subnet 2:  192.168.1.64/26  Hosts: .65 - .126
Subnet 3:  192.168.1.128/26 Hosts: .129 - .190
Subnet 4:  192.168.1.192/26 Hosts: .193 - .254

Each subnet: 2^(32-26) - 2 = 62 hosts`,
        language: 'Text',
        output: 'Network: 192.168.1.0 | Hosts: 254 | Broadcast: 192.168.1.255',
      },
    ],
    quiz: {
      title: 'Computer Networks MCQ Quiz',
      questions: [
        {
          question: 'How many layers are in the OSI model?',
          options: ['4', '5', '6', '7'],
          answer: 3,
          explanation: 'The OSI model has 7 layers: Physical, Data Link, Network, Transport, Session, Presentation, Application.',
        },
        {
          question: 'Which protocol is used for reliable, connection-oriented communication?',
          options: ['UDP', 'IP', 'TCP', 'ICMP'],
          answer: 2,
          explanation: 'TCP (Transmission Control Protocol) provides reliable, ordered, error-checked delivery via a connection-oriented approach.',
        },
        {
          question: 'What does DNS stand for?',
          options: ['Data Network System', 'Domain Name System', 'Digital Network Service', 'Dynamic Name Server'],
          answer: 1,
          explanation: 'DNS (Domain Name System) translates human-readable domain names (like google.com) to IP addresses.',
        },
        {
          question: 'Which layer of the OSI model is responsible for routing packets?',
          options: ['Data Link Layer', 'Transport Layer', 'Network Layer', 'Application Layer'],
          answer: 2,
          explanation: 'The Network Layer (Layer 3) handles packet routing using IP addresses. Routers operate at this layer.',
        },
        {
          question: 'What is the port number for HTTP?',
          options: ['21', '25', '80', '443'],
          answer: 2,
          explanation: 'HTTP uses port 80. HTTPS uses port 443. FTP uses ports 20/21. SMTP uses port 25.',
        },
      ],
    },
  },

  // ── SE ────────────────────────────────────────────────────────────────────
  se: {
    explanations: [
      {
        keywords: ['sdlc', 'lifecycle', 'development', 'phase', 'waterfall', 'agile', 'spiral'],
        title: 'Software Development Life Cycle (SDLC)',
        body: `<strong>SDLC</strong> is a structured process for developing software. Common models:`,
        points: [
          '<strong>Waterfall Model</strong> — Linear, sequential. Each phase completes before the next begins. Simple but inflexible.',
          '<strong>Agile Model</strong> — Iterative, flexible. Software delivered in small increments (sprints). Focus on customer collaboration.',
          '<strong>Spiral Model</strong> — Risk-driven. Combines iterative development with systematic risk analysis.',
          '<strong>V-Model</strong> — Each development phase has a corresponding testing phase.',
          '<strong>Prototyping</strong> — Build a prototype first to get user feedback.',
        ],
        note: '💡 Agile is the most widely used in industry today. Scrum and Kanban are popular Agile frameworks.',
        syllabusDependent: true,
      },
      {
        keywords: ['testing', 'unit', 'integration', 'system', 'acceptance', 'black box', 'white box'],
        title: 'Software Testing',
        body: `<strong>Software Testing</strong> verifies that software works correctly and meets requirements.`,
        points: [
          '<strong>Unit Testing</strong> — Testing individual components/functions in isolation.',
          '<strong>Integration Testing</strong> — Testing combined modules for interaction issues.',
          '<strong>System Testing</strong> — Testing the complete system against requirements.',
          '<strong>Acceptance Testing</strong> — User validates the system meets business needs.',
          '<strong>Black Box Testing</strong> — Testing without knowledge of internal code.',
          '<strong>White Box Testing</strong> — Testing with full knowledge of internal code.',
        ],
        note: '💡 Test early and test often! Fixing bugs early is 10x cheaper than fixing after deployment.',
        syllabusDependent: false,
      },
      {
        keywords: [],
        title: 'Software Engineering Basics',
        body: `<strong>Software Engineering</strong> applies engineering principles to software development. Key areas:`,
        points: [
          '<strong>Requirements Engineering</strong> — Gathering, documenting, and managing software requirements.',
          '<strong>Software Design</strong> — Creating architectural and detailed designs (UML diagrams).',
          '<strong>Project Management</strong> — Planning, scheduling, cost estimation (COCOMO model).',
          '<strong>Quality Assurance</strong> — Ensuring the software meets quality standards.',
          '<strong>Software Maintenance</strong> — Corrective, adaptive, perfective, preventive maintenance.',
        ],
        note: '💡 70% of software project failures are due to poor requirements gathering!',
        syllabusDependent: true,
      },
    ],
    notes: [
      {
        keywords: [],
        title: 'Short Notes: Software Engineering',
        sections: [
          { heading: 'SDLC Phases', items: ['1. Planning, 2. Requirements, 3. Design', '4. Implementation, 5. Testing', '6. Deployment, 7. Maintenance'] },
          { heading: 'SDLC Models', items: ['Waterfall: Linear, simple, rigid', 'Agile: Iterative, flexible, customer-focused', 'Spiral: Risk-driven, iterative', 'V-Model: Verification & Validation'] },
          { heading: 'UML Diagrams', items: ['Use Case Diagram: actors & system interactions', 'Class Diagram: structure of classes', 'Sequence Diagram: message flow over time', 'Activity Diagram: workflow/flowchart'] },
        ],
      },
    ],
    examples: [
      {
        keywords: [],
        title: 'Use Case Diagram (Text Representation)',
        description: 'A simple use case diagram for an online banking system:',
        code: `SYSTEM: Online Banking System
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ACTORS:
  👤 Customer
  👤 Bank Admin
  🖥️ External Payment System

USE CASES (inside system boundary):
  ┌─────────────────────────────────────┐
  │  ○ Login / Logout                   │
  │  ○ View Account Balance             │
  │  ○ Transfer Funds ─────────────────────── External Payment System
  │  ○ Pay Bills                        │
  │  ○ View Transaction History         │
  │  ○ Manage Users ─── (Bank Admin only)│
  └─────────────────────────────────────┘
       │                    │
    Customer           Bank Admin

RELATIONSHIPS:
  <<include>> Transfer Funds includes Authentication
  <<extend>>  View Receipt extends Transfer Funds`,
        language: 'Text',
        output: 'Use Case Diagram for Online Banking System',
      },
    ],
    quiz: {
      title: 'Software Engineering MCQ Quiz',
      questions: [
        {
          question: 'Which SDLC model is most suitable for projects with unclear requirements?',
          options: ['Waterfall', 'V-Model', 'Agile', 'Big Bang'],
          answer: 2,
          explanation: 'Agile is best for projects with changing or unclear requirements due to its iterative nature and flexibility.',
        },
        {
          question: 'Testing without knowledge of the internal code structure is called?',
          options: ['White Box Testing', 'Grey Box Testing', 'Black Box Testing', 'Unit Testing'],
          answer: 2,
          explanation: 'Black Box Testing tests functionality without knowing the internal implementation. Testers act as end users.',
        },
        {
          question: 'Which SDLC model emphasizes risk analysis at every phase?',
          options: ['Waterfall', 'Agile', 'Spiral', 'Prototype'],
          answer: 2,
          explanation: 'The Spiral Model incorporates risk analysis at each iteration/spiral, making it ideal for high-risk projects.',
        },
        {
          question: 'What does UML stand for?',
          options: ['Universal Modeling Language', 'Unified Modeling Language', 'Unified Module Language', 'Universal Module Logic'],
          answer: 1,
          explanation: 'UML (Unified Modeling Language) is a standardized visual language for modeling software systems.',
        },
        {
          question: 'Which type of software maintenance is performed to prevent future problems?',
          options: ['Corrective', 'Adaptive', 'Perfective', 'Preventive'],
          answer: 3,
          explanation: 'Preventive maintenance improves maintainability and prevents future issues. Corrective = fixes bugs, Adaptive = changes env, Perfective = adds features.',
        },
      ],
    },
  },

  // ── GENERAL FALLBACK ──────────────────────────────────────────────────────
  general: {
    explanations: [
      {
        keywords: [],
        title: 'General Answer',
        body: 'Please select a specific subject from the sidebar to get a more targeted and relevant answer for your BTech coursework.',
        points: ['I can help with Java, Python, DSA, DBMS, Operating Systems, Computer Networks, and Software Engineering.', 'For each subject, I can explain concepts, generate short notes, create MCQ quizzes, and show code examples.'],
        syllabusDependent: false,
      },
    ],
    notes: [{ keywords: [], title: 'Select a Subject', sections: [{ heading: 'Available Subjects', items: ['Java, Python, DSA, DBMS, OS, CN, SE'] }] }],
    examples: [{ keywords: [], title: 'Select a Subject', description: 'Please select a subject to get code examples.', code: '// Select a subject first!', language: 'Text', output: '' }],
    quiz: { title: 'General Quiz', questions: [{ question: 'Select a subject for subject-specific questions!', options: ['Java', 'Python', 'DSA', 'DBMS'], answer: 0, explanation: 'All subjects are available!' }] },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// AI SERVICE FACTORY
// ─────────────────────────────────────────────────────────────────────────────

const AI = USE_REAL_AI ? new RealAIService() : new MockAIService();

// ─────────────────────────────────────────────────────────────────────────────
// APP STATE
// ─────────────────────────────────────────────────────────────────────────────

let state = {
  selectedSubject: null,
  messages: [],
  isLoading: false,
  quizData: null,
  quizCurrentQ: 0,
  quizAnswered: [],
  quizScore: 0,
};

let currentUser = null;
let currentToken = localStorage.getItem('btech_token') || null;
let isSignupMode = true;

// ─────────────────────────────────────────────────────────────────────────────
// DOM REFS
// ─────────────────────────────────────────────────────────────────────────────

const $ = id => document.getElementById(id);

const els = {
  subjectList:    $('subjectList'),
  quickActions:   $('quickActions'),
  welcomeScreen:  $('welcomeScreen'),
  chatMessages:   $('chatMessages'),
  typingIndicator:$('typingIndicator'),
  userInput:      $('userInput'),
  sendBtn:        $('sendBtn'),
  inputHint:      $('inputHint'),
  subjectPillBar: $('subjectPillBar'),
  activePill:     $('activePill'),
  syllabusNote:   $('syllabusNote'),
  clearChatBtn:   $('clearChatBtn'),
  quizModal:      $('quizModal'),
  quizTitle:      $('quizTitle'),
  quizBody:       $('quizBody'),
  quizProgress:   $('quizProgress'),
  quizPrev:       $('quizPrev'),
  quizNext:       $('quizNext'),
  quizClose:      $('quizClose'),

  // Auth & Dashboard
  userMenuContainer: $('userMenuContainer'),
  loggedInContainer: $('loggedInContainer'),
  userNameText:      $('userNameText'),
  userBadge:         $('userBadge'),
  loginBtn:          $('loginBtn'),
  signupBtn:         $('signupBtn'),
  dashboardBtn:      $('dashboardBtn'),
  logoutBtn:         $('logoutBtn'),
  
  authModal:         $('authModal'),
  authModalContent:  $('authModalContent'),
  authTitle:         $('authTitle'),
  authClose:         $('authClose'),
  authForm:          $('authForm'),
  nameGroup:         $('nameGroup'),
  authName:          $('authName'),
  authEmail:         $('authEmail'),
  authPassword:      $('authPassword'),
  authError:         $('authError'),
  authSubmit:        $('authSubmit'),
  authSwitchText:    $('authSwitchText'),
  authSwitchLink:    $('authSwitchLink'),

  dashboardModal:    $('dashboardModal'),
  dashboardClose:    $('dashboardClose'),
  dashboardStats:    $('dashboardStats'),
};

// ─────────────────────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────────────────────

function init() {
  createParticles();
  renderSubjects();
  bindEvents();
  updateQuickButtons(false);

  // Ensure this browser session has an ID
  getSessionId();

  // Check auth
  if (currentToken) {
    API.getMe().then(data => {
      if (data && data.ok) {
        currentUser = data.user;
        renderUserMenu();
      } else {
        logout(false); // invalid token
      }
    }).catch(() => renderUserMenu());
  } else {
    renderUserMenu();
  }

  // Check backend health and update the status badge
  API.checkHealth().then(health => {
    const badge = $('statusText');
    if (!badge) return;
    if (health && health.ok) {
      badge.textContent = health.database.connected ? '✅ Backend + DB' : '⚠️ Backend (No DB)';
      $('statusBadge').style.background    = health.database.connected
        ? 'rgba(0,212,170,0.12)' : 'rgba(245,158,11,0.12)';
      $('statusBadge').style.borderColor   = health.database.connected
        ? 'rgba(0,212,170,0.3)' : 'rgba(245,158,11,0.3)';
      $('statusBadge').style.color         = health.database.connected
        ? 'var(--clr-accent)' : '#f59e0b';
    } else {
      badge.textContent = 'Mock Mode';
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTH LOGIC
// ─────────────────────────────────────────────────────────────────────────────

function renderUserMenu() {
  if (currentUser) {
    if (els.userMenuContainer) els.userMenuContainer.style.display = 'none';
    if (els.loggedInContainer) els.loggedInContainer.style.display = 'flex';
    if (els.userNameText) els.userNameText.textContent = currentUser.name || 'Student';
  } else {
    if (els.userMenuContainer) els.userMenuContainer.style.display = 'flex';
    if (els.loggedInContainer) els.loggedInContainer.style.display = 'none';
  }
}

function openAuthModal(isSignup) {
  isSignupMode = isSignup;
  if (!els.authModal) return;
  els.authModal.style.display = 'flex';
  els.authError.style.display = 'none';
  els.authForm.reset();
  
  if (isSignupMode) {
    els.authTitle.textContent = 'Sign Up';
    els.nameGroup.style.display = 'block';
    els.authName.required = true;
    els.authSubmit.textContent = 'Sign Up';
    els.authSwitchText.textContent = 'Already have an account?';
    els.authSwitchLink.textContent = 'Log in';
  } else {
    els.authTitle.textContent = 'Log In';
    els.nameGroup.style.display = 'none';
    els.authName.required = false;
    els.authSubmit.textContent = 'Log In';
    els.authSwitchText.textContent = 'Don\'t have an account?';
    els.authSwitchLink.textContent = 'Sign up';
  }
}

function closeAuthModal() {
  if (els.authModal) els.authModal.style.display = 'none';
}

function logout(reload = true) {
  localStorage.removeItem('btech_token');
  currentToken = null;
  currentUser = null;
  renderUserMenu();
  if (reload) window.location.reload();
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  els.authError.style.display = 'none';
  els.authSubmit.disabled = true;
  els.authSubmit.textContent = 'Wait...';

  try {
    const email = els.authEmail.value;
    const password = els.authPassword.value;
    let res;

    if (isSignupMode) {
      const name = els.authName.value;
      res = await API.signup(name, email, password);
    } else {
      res = await API.login(email, password);
    }

    if (res && res.ok) {
      localStorage.setItem('btech_token', res.token);
      currentToken = res.token;
      currentUser = res.user;
      renderUserMenu();
      closeAuthModal();
    } else {
      els.authError.textContent = res ? res.error : 'Network error.';
      els.authError.style.display = 'block';
    }
  } catch (err) {
    els.authError.textContent = 'Failed to connect to server.';
    els.authError.style.display = 'block';
  } finally {
    els.authSubmit.disabled = false;
    els.authSubmit.textContent = isSignupMode ? 'Sign Up' : 'Log In';
  }
}

async function openDashboardModal() {
  if (!els.dashboardModal) return;
  els.dashboardModal.style.display = 'flex';
  els.dashboardStats.innerHTML = '<div style="text-align:center; padding:2rem; color:var(--clr-text-muted);">Loading stats...</div>';
  
  try {
    const res = await API.getStats();
    if (res && res.ok && res.stats) {
      if (res.stats.length === 0) {
        els.dashboardStats.innerHTML = '<div style="text-align:center; padding:2rem; color:var(--clr-text-muted);">No quiz data found yet. Take a quiz to see your stats!</div>';
        return;
      }

      let totalQuizzes = 0;
      let totalScore = 0;
      let totalQuestions = 0;
      
      res.stats.forEach(s => {
        totalQuizzes += s.count;
        totalScore += s.totalScore;
        totalQuestions += s.totalQuestions;
      });

      const avgScore = totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0;

      let html = `
        <div class="dashboard-grid">
          <div class="stat-card">
            <div class="stat-card-title">Quizzes Taken</div>
            <div class="stat-card-value">${totalQuizzes}</div>
          </div>
          <div class="stat-card">
            <div class="stat-card-title">Avg Score</div>
            <div class="stat-card-value">${avgScore}%</div>
          </div>
        </div>
        <h4 style="margin-top: 1.5rem; margin-bottom: 0.5rem; color: var(--clr-text);">Subject Breakdown</h4>
        <div class="subject-stats-list">
      `;

      res.stats.forEach(s => {
        const p = Math.round((s.totalScore / s.totalQuestions) * 100);
        html += `
          <div style="display:flex; justify-content:space-between; align-items:center; padding: 0.8rem 1rem; background: var(--clr-code-bg); border-radius: var(--radius-sm); margin-bottom: 0.5rem;">
            <span style="font-weight: 500;">${s._id.toUpperCase()}</span>
            <span style="color: var(--clr-text-muted); font-size: 0.9rem;">${s.count} quizzes • ${p}% avg</span>
          </div>
        `;
      });
      html += '</div>';

      els.dashboardStats.innerHTML = html;
    } else {
      els.dashboardStats.innerHTML = '<div style="text-align:center; padding:2rem; color:var(--clr-text-muted);">Failed to load stats.</div>';
    }
  } catch (err) {
    els.dashboardStats.innerHTML = '<div style="text-align:center; padding:2rem; color:var(--clr-text-muted);">Network Error</div>';
  }
}

function closeDashboardModal() {
  if (els.dashboardModal) els.dashboardModal.style.display = 'none';
}

// ─────────────────────────────────────────────────────────────────────────────
// BACKGROUND PARTICLES
// ─────────────────────────────────────────────────────────────────────────────

function createParticles() {
  const container = $('bgParticles');
  const colors = ['#6C63FF', '#00D4AA', '#ff6584', '#f59e0b'];
  for (let i = 0; i < 18; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = 40 + Math.random() * 120;
    p.style.cssText = `
      width: ${size}px; height: ${size}px;
      left: ${Math.random() * 100}%;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      animation-duration: ${12 + Math.random() * 18}s;
      animation-delay: ${-Math.random() * 20}s;
    `;
    container.appendChild(p);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RENDER SUBJECTS
// ─────────────────────────────────────────────────────────────────────────────

function renderSubjects() {
  els.subjectList.innerHTML = '';
  SUBJECTS.forEach(s => {
    const el = document.createElement('button');
    el.className = 'subject-item';
    el.id = `subj-${s.id}`;
    el.setAttribute('aria-label', `Select ${s.name}`);
    el.innerHTML = `
      <span class="subject-dot"></span>
      <span class="subject-emoji">${s.emoji}</span>
      <span class="subject-name">${s.name}</span>
      <span class="subject-chip">CSE</span>
    `;
    el.addEventListener('click', () => selectSubject(s));
    els.subjectList.appendChild(el);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SELECT SUBJECT
// ─────────────────────────────────────────────────────────────────────────────

function selectSubject(subject) {
  // Deactivate all
  document.querySelectorAll('.subject-item').forEach(el => el.classList.remove('active'));

  // Activate selected
  const el = $(`subj-${subject.id}`);
  if (el) el.classList.add('active');

  state.selectedSubject = subject;

  // Update UI
  els.activePill.textContent = `${subject.emoji} ${subject.name}`;
  els.subjectPillBar.style.display = 'flex';

  els.userInput.disabled = false;
  els.userInput.placeholder = `Ask anything about ${subject.name}...`;
  els.sendBtn.disabled = false;
  els.inputHint.textContent = `Studying ${subject.name} · Type your question or use Quick Actions above`;

  els.syllabusNote.style.display = 'block';

  updateQuickButtons(true);

  // Switch from welcome to chat if needed
  if (state.messages.length === 0) {
    addWelcomeMessage(subject);
  }

  // Focus input
  els.userInput.focus();
}

function addWelcomeMessage(subject) {
  els.welcomeScreen.style.display = 'none';
  els.chatMessages.style.display = 'flex';

  addMessage('ai', {
    type: 'explanation',
    content: {
      title: `Ready to study ${subject.name}! 👋`,
      body: `I'm your BTech AI Tutor for <strong>${subject.name}</strong>. Here's what I can help you with:`,
      points: [
        '🧠 Explain concepts in simple, student-friendly language',
        '📝 Generate short notes for quick revision',
        '🧩 Create MCQ quizzes to test your knowledge',
        '💻 Show code examples with step-by-step explanations',
      ],
      note: `💡 Use the Quick Action buttons on the left sidebar for one-click study tools!`,
    },
    subjectNote: false,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// QUICK ACTION BUTTONS
// ─────────────────────────────────────────────────────────────────────────────

function updateQuickButtons(enabled) {
  document.querySelectorAll('.quick-btn').forEach(btn => {
    btn.disabled = !enabled;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SEND MESSAGE
// ─────────────────────────────────────────────────────────────────────────────

async function sendMessage(text, actionType = 'general') {
  if (!state.selectedSubject) {
    showToast('Please select a subject first!');
    return;
  }
  if (state.isLoading) return;
  if (!text.trim()) return;

  state.isLoading = true;

  // Show welcome → chat transition
  if (state.messages.length === 0) {
    els.welcomeScreen.style.display = 'none';
    els.chatMessages.style.display = 'flex';
  }

  // Add user message
  addUserMessage(text);

  // Clear input
  els.userInput.value = '';
  autoResizeTextarea();

  // Disable input
  els.sendBtn.disabled = true;
  els.userInput.disabled = true;

  // Show typing
  showTyping();

  try {
    const response = await AI.respond(text, state.selectedSubject.id, actionType);
    hideTyping();
    addMessage('ai', response);

    // Open quiz modal for quiz responses
    if (response.type === 'quiz') {
      openQuizModal(response.content);
    }
  } catch (err) {
    hideTyping();
    addMessage('ai', {
      type: 'explanation',
      content: {
        title: 'Oops! Something went wrong',
        body: `I encountered an error: <strong>${err.message}</strong>`,
        points: ['Please check your internet connection and try again.', 'If you configured a real AI API, verify your API key.'],
        note: '',
      },
    });
  }

  state.isLoading = false;
  els.userInput.disabled = false;
  els.sendBtn.disabled = false;
  els.userInput.focus();
}

// ─────────────────────────────────────────────────────────────────────────────
// MESSAGE RENDERING
// ─────────────────────────────────────────────────────────────────────────────

function addUserMessage(text) {
  const msgData = { role: 'user', text };
  state.messages.push(msgData);

  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const bubble = document.createElement('div');
  bubble.className = 'msg user';
  bubble.innerHTML = `
    <div class="msg-avatar">You</div>
    <div class="msg-content">
      <div class="msg-meta">
        <span>${time}</span>
      </div>
      <div class="msg-bubble">${escapeHtml(text)}</div>
    </div>
  `;
  els.chatMessages.appendChild(bubble);
  scrollToBottom();

  // ── Save user message to backend (fire-and-forget) ──
  if (state.selectedSubject) {
    API.saveMessage({
      subject:     state.selectedSubject.id,
      subjectName: state.selectedSubject.name,
      role:        'user',
      text,
      actionType:  'general',
    });
  }
}

function addMessage(role, response) {
  state.messages.push({ role, response });

  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const subjectTag = state.selectedSubject
    ? `<span class="msg-subject-tag">${state.selectedSubject.emoji} ${state.selectedSubject.name}</span>`
    : '';

  const bubble = document.createElement('div');
  bubble.className = `msg ${role}`;

  let bodyHtml = '';

  if (response.type === 'explanation') {
    bodyHtml = renderExplanation(response.content, response.subjectNote);
  } else if (response.type === 'notes') {
    bodyHtml = renderNotes(response.content);
  } else if (response.type === 'example') {
    bodyHtml = renderExample(response.content);
  } else if (response.type === 'quiz') {
    bodyHtml = `<p>📝 Opening <strong>MCQ Quiz</strong> for <strong>${state.selectedSubject?.name || 'the selected subject'}</strong>...</p>
    <p style="color:var(--clr-text-muted);font-size:0.82rem;">The quiz modal will appear shortly.</p>`;
  }

  bubble.innerHTML = `
    <div class="msg-avatar">AI</div>
    <div class="msg-content">
      <div class="msg-meta">
        ${subjectTag}
        <span>${time}</span>
      </div>
      <div class="msg-bubble">${bodyHtml}</div>
    </div>
  `;

  els.chatMessages.appendChild(bubble);
  scrollToBottom();

  // ── Save AI message to backend (fire-and-forget) ──
  if (state.selectedSubject) {
    API.saveMessage({
      subject:      state.selectedSubject.id,
      subjectName:  state.selectedSubject.name,
      role:         'ai',
      text:         '',
      responseType: response.type || '',
      responseTitle: (response.content && response.content.title) ? response.content.title : '',
      actionType:   'general',
    });
  }
}

function renderExplanation(content, showSyllabusWarning) {
  let html = '';

  if (content.title) html += `<h3>${content.title}</h3>`;
  if (content.body)  html += `<p>${content.body}</p>`;

  if (content.points?.length) {
    html += '<ul>';
    content.points.forEach(p => { html += `<li>${p}</li>`; });
    html += '</ul>';
  }

  if (content.note) html += `<div class="note-box">${content.note}</div>`;
  if (content.tip)  html += `<div class="tip-box">${content.tip}</div>`;

  if (showSyllabusWarning) {
    html += `<div class="syllabus-warn">⚠️ <span>This topic may vary based on your university syllabus or prescribed textbook. Always verify with your course material.</span></div>`;
  }

  return html;
}

function renderNotes(content) {
  let html = '';
  if (content.title) html += `<h3>📝 ${content.title}</h3>`;

  if (content.sections?.length) {
    content.sections.forEach(sec => {
      html += `<div class="notes-section"><h4>${sec.heading}</h4><ul>`;
      sec.items.forEach(item => { html += `<li>${item}</li>`; });
      html += '</ul></div>';
    });
  }

  html += `<div class="tip-box">💡 Save these notes! Quick revision before exams can boost your score significantly.</div>`;
  return html;
}

function renderExample(content) {
  let html = '';
  if (content.title)       html += `<h3>💻 ${content.title}</h3>`;
  if (content.description) html += `<p>${content.description}</p>`;

  if (content.code) {
    html += `<div class="code-block">
      <span class="code-label">${content.language || 'Code'}</span>${escapeHtml(content.code)}</div>`;
  }

  if (content.output) {
    html += `<div class="note-box"><strong>Output:</strong><br><code style="font-family:var(--font-mono);font-size:0.8rem;">${escapeHtml(content.output)}</code></div>`;
  }

  return html;
}

// ─────────────────────────────────────────────────────────────────────────────
// QUIZ MODAL
// ─────────────────────────────────────────────────────────────────────────────

function openQuizModal(quizData) {
  state.quizData = quizData;
  state.quizCurrentQ = 0;
  state.quizAnswered = new Array(quizData.questions.length).fill(null);
  state.quizScore = 0;

  els.quizTitle.textContent = quizData.title;
  els.quizModal.style.display = 'flex';
  renderQuizQuestion();
}

function renderQuizQuestion() {
  const { questions } = state.quizData;
  const i = state.quizCurrentQ;

  if (i >= questions.length) {
    renderQuizScore();
    return;
  }

  const q = questions[i];
  const answered = state.quizAnswered[i];

  els.quizProgress.textContent = `${i + 1} / ${questions.length}`;

  const letters = ['A', 'B', 'C', 'D'];
  let optsHtml = q.options.map((opt, idx) => {
    let cls = 'quiz-opt';
    if (answered !== null) {
      cls += ' answered';
      if (idx === q.answer) cls += ' correct';
      else if (idx === answered) cls += ' wrong';
    }
    return `<button class="${cls}" data-idx="${idx}">
      <span class="quiz-opt-letter">${letters[idx]}</span>
      ${escapeHtml(opt)}
    </button>`;
  }).join('');

  let explanationHtml = '';
  if (answered !== null) {
    explanationHtml = `<div class="quiz-explanation" style="display:block;">💡 ${escapeHtml(q.explanation)}</div>`;
  }

  els.quizBody.innerHTML = `
    <div class="quiz-q-card">
      <div class="quiz-q-num">Question ${i + 1}</div>
      <div class="quiz-q-text">${escapeHtml(q.question)}</div>
      <div class="quiz-opts">${optsHtml}</div>
      ${explanationHtml}
    </div>
  `;

  // Bind option clicks
  els.quizBody.querySelectorAll('.quiz-opt').forEach(btn => {
    if (answered !== null) return; // already answered
    btn.addEventListener('click', () => {
      const chosen = parseInt(btn.dataset.idx);
      state.quizAnswered[i] = chosen;
      if (chosen === q.answer) state.quizScore++;
      renderQuizQuestion();
    });
  });

  // Prev/Next button state
  els.quizPrev.disabled = i === 0;
  els.quizNext.textContent = i === questions.length - 1 ? 'View Score' : 'Next →';
}

function renderQuizScore() {
  const total = state.quizData.questions.length;
  const score = state.quizScore;
  const pct   = Math.round((score / total) * 100);

  let emoji = '😐';
  if (pct >= 80) emoji = '🎉';
  else if (pct >= 60) emoji = '👍';
  else if (pct < 40) emoji = '📚';

  els.quizBody.innerHTML = `
    <div class="quiz-score-card">
      <div style="font-size:3rem;margin-bottom:12px;">${emoji}</div>
      <div class="quiz-score-num">${score} / ${total}</div>
      <div class="quiz-score-label">${pct}% score</div>
      <p style="margin-top:16px;color:var(--clr-text-muted);font-size:0.85rem;">
        ${pct >= 80 ? 'Excellent! You\'ve mastered this topic.' :
          pct >= 60 ? 'Good job! Review the questions you got wrong.' :
          'Keep studying! Go through the concepts again and retry.'}
      </p>
      <button class="btn-primary" id="retakeBtn" style="margin-top:20px;">Retake Quiz</button>
    </div>
  `;

  els.quizProgress.textContent = `Score: ${pct}%`;
  els.quizNext.style.display = 'none';
  els.quizPrev.style.display = 'none';

  $('retakeBtn').addEventListener('click', () => openQuizModal(state.quizData));

  // ── Save quiz attempt to backend (fire-and-forget) ──
  if (state.selectedSubject) {
    const questionsPayload = (state.quizData.questions || []).map((q, idx) => ({
      question:     q.question,
      options:      q.options,
      chosenIndex:  state.quizAnswered[idx] ?? -1,
      correctIndex: q.answer,
      isCorrect:    state.quizAnswered[idx] === q.answer,
      explanation:  q.explanation || '',
    }));
    API.saveQuiz({
      subject:     state.selectedSubject.id,
      subjectName: state.selectedSubject.name,
      quizTitle:   state.quizData.title || `${state.selectedSubject.name} Quiz`,
      score,
      total,
      questions:   questionsPayload,
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPING INDICATOR
// ─────────────────────────────────────────────────────────────────────────────

function showTyping() { els.typingIndicator.style.display = 'flex'; scrollToBottom(); }
function hideTyping()  { els.typingIndicator.style.display = 'none'; }

// ─────────────────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

function scrollToBottom() {
  setTimeout(() => {
    els.chatMessages.scrollTo({ top: els.chatMessages.scrollHeight, behavior: 'smooth' });
  }, 50);
}

function autoResizeTextarea() {
  const ta = els.userInput;
  ta.style.height = 'auto';
  ta.style.height = Math.min(ta.scrollHeight, 140) + 'px';
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showToast(message) {
  // Simple toast notification
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.cssText = `
      position:fixed; bottom:30px; left:50%; transform:translateX(-50%);
      background:var(--clr-surface); border:1px solid var(--clr-border);
      color:var(--clr-text); padding:10px 20px; border-radius:99px;
      font-size:0.84rem; font-weight:500; z-index:300;
      animation:fadeIn 0.2s ease;
      box-shadow:0 4px 20px rgba(0,0,0,0.4);
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.style.display = 'block';
  setTimeout(() => { toast.style.display = 'none'; }, 2500);
}

// ─────────────────────────────────────────────────────────────────────────────
// EVENT BINDING
// ─────────────────────────────────────────────────────────────────────────────

function bindEvents() {
  // Send on button click
  els.sendBtn.addEventListener('click', () => {
    const text = els.userInput.value.trim();
    if (text) sendMessage(text);
  });

  // Send on Enter (not Shift+Enter)
  els.userInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const text = els.userInput.value.trim();
      if (text && !state.isLoading) sendMessage(text);
    }
  });

  // Auto-resize textarea
  els.userInput.addEventListener('input', autoResizeTextarea);

  // Quick action buttons
  document.querySelectorAll('.quick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      if (!state.selectedSubject) { showToast('Select a subject first!'); return; }

      const prompts = {
        explain: `Explain a key concept in ${state.selectedSubject.name}`,
        notes:   `Generate short notes for ${state.selectedSubject.name}`,
        quiz:    `Generate an MCQ quiz for ${state.selectedSubject.name}`,
        example: `Show me a code example for ${state.selectedSubject.name}`,
      };

      const text = prompts[action] || `Tell me about ${state.selectedSubject.name}`;
      sendMessage(text, action);
    });
  });

  // Clear chat
  els.clearChatBtn.addEventListener('click', () => {
    state.messages = [];
    els.chatMessages.innerHTML = '';
    if (state.selectedSubject) {
      addWelcomeMessage(state.selectedSubject);
    } else {
      els.chatMessages.style.display = 'none';
      els.welcomeScreen.style.display = 'flex';
    }
  });

  // Quiz modal close
  els.quizClose.addEventListener('click', () => {
    els.quizModal.style.display = 'none';
    els.quizNext.style.display = '';
    els.quizPrev.style.display = '';
  });

  // Global Modal click outside to close
  window.addEventListener('click', e => {
    if (e.target === els.quizModal) {
      els.quizModal.style.display = 'none';
      els.quizNext.style.display = '';
      els.quizPrev.style.display = '';
    }
    if (e.target === els.authModal) closeAuthModal();
    if (e.target === els.dashboardModal) closeDashboardModal();
  });

  // Quiz navigation
  els.quizNext.addEventListener('click', () => {
    if (state.quizCurrentQ >= state.quizData.questions.length - 1) {
      renderQuizScore();
    } else {
      state.quizCurrentQ++;
      renderQuizQuestion();
    }
  });

  els.quizPrev.addEventListener('click', () => {
    if (state.quizCurrentQ > 0) {
      state.quizCurrentQ--;
      renderQuizQuestion();
    }
  });

  // Auth & Dashboard Events
  if (els.signupBtn) els.signupBtn.addEventListener('click', () => openAuthModal(true));
  if (els.loginBtn) els.loginBtn.addEventListener('click', () => openAuthModal(false));
  if (els.authClose) els.authClose.addEventListener('click', closeAuthModal);
  if (els.dashboardBtn) els.dashboardBtn.addEventListener('click', openDashboardModal);
  if (els.userBadge) els.userBadge.addEventListener('click', openDashboardModal);
  if (els.dashboardClose) els.dashboardClose.addEventListener('click', closeDashboardModal);
  if (els.logoutBtn) els.logoutBtn.addEventListener('click', () => logout());
  
  if (els.authSwitchLink) {
    els.authSwitchLink.addEventListener('click', (e) => {
      e.preventDefault();
      openAuthModal(!isSignupMode);
    });
  }
  if (els.authForm) els.authForm.addEventListener('submit', handleAuthSubmit);
}

// ─────────────────────────────────────────────────────────────────────────────
// START THE APP
// ─────────────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', init);
