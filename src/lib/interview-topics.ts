/** Full interview catalogue across every major career domain. */
export interface TopicCategory {
  id: string;
  label: string;
  emoji: string;
  groups: { name: string; topics: string[] }[];
}

export const INTERVIEW_CATEGORIES: TopicCategory[] = [
  {
    id: "tech",
    label: "Technical & IT",
    emoji: "💻",
    groups: [
      {
        name: "Programming Languages",
        topics: [
          "Python",
          "Java",
          "JavaScript",
          "TypeScript",
          "C",
          "C++",
          "C#",
          "Go",
          "PHP",
          "Kotlin",
          "Swift",
          "Rust",
          "R",
        ],
      },
      {
        name: "Web Development",
        topics: ["HTML", "CSS", "React", "Angular", "Vue.js", "Next.js", "Node.js", "Express.js"],
      },
      {
        name: "Databases",
        topics: ["MySQL", "PostgreSQL", "MongoDB", "SQLite", "Oracle SQL", "Firebase"],
      },
      {
        name: "AI & Data Science",
        topics: [
          "Machine Learning",
          "Deep Learning",
          "NLP",
          "Computer Vision",
          "TensorFlow",
          "PyTorch",
        ],
      },
      {
        name: "Cybersecurity",
        topics: [
          "Ethical Hacking",
          "SOC Analyst",
          "SIEM",
          "Splunk",
          "IBM QRadar",
          "Network Security",
        ],
      },
      {
        name: "Cloud & DevOps",
        topics: [
          "AWS",
          "Azure",
          "Google Cloud",
          "Docker",
          "Kubernetes",
          "Jenkins",
          "Git",
          "GitHub",
        ],
      },
      {
        name: "Computer Science",
        topics: [
          "Data Structures",
          "Algorithms",
          "DBMS",
          "Operating Systems",
          "Computer Networks",
          "OOP",
          "System Design",
        ],
      },
    ],
  },
  {
    id: "finance",
    label: "Finance & Accounting",
    emoji: "💰",
    groups: [
      {
        name: "Finance & Accounting",
        topics: [
          "Financial Accounting",
          "Cost Accounting",
          "Management Accounting",
          "Taxation",
          "GST",
          "Income Tax",
          "Auditing",
          "Financial Management",
          "Corporate Finance",
          "Investment Banking",
          "Financial Analysis",
          "Stock Market",
          "Mutual Funds",
          "Banking",
          "Insurance",
          "Risk Management",
          "Budgeting",
          "Payroll",
          "Tally ERP",
          "SAP FICO",
          "QuickBooks",
        ],
      },
    ],
  },
  {
    id: "commerce",
    label: "Commerce (B.Com / M.Com)",
    emoji: "📊",
    groups: [
      {
        name: "Commerce",
        topics: [
          "Accounting Principles",
          "Business Economics",
          "Business Law",
          "Company Law",
          "Banking",
          "Finance",
          "Auditing",
          "Cost Accounting",
          "Income Tax",
          "GST",
          "Statistics",
          "Entrepreneurship",
          "E-Commerce",
          "Corporate Accounting",
          "Financial Reporting",
        ],
      },
    ],
  },
  {
    id: "mba",
    label: "MBA & Management",
    emoji: "📈",
    groups: [
      {
        name: "Management",
        topics: [
          "Marketing",
          "Digital Marketing",
          "Human Resources (HR)",
          "Finance",
          "Operations Management",
          "Supply Chain",
          "International Business",
          "Strategic Management",
          "Business Analytics",
          "Leadership",
          "Organizational Behavior",
          "Sales Management",
          "Project Management",
          "Business Communication",
          "Entrepreneurship",
        ],
      },
    ],
  },
  {
    id: "marketing",
    label: "Marketing & Sales",
    emoji: "📢",
    groups: [
      {
        name: "Marketing & Sales",
        topics: [
          "Sales",
          "Customer Relationship Management (CRM)",
          "Branding",
          "Advertising",
          "SEO",
          "SEM",
          "Social Media Marketing",
          "Email Marketing",
          "Market Research",
          "Consumer Behavior",
          "Business Development",
        ],
      },
    ],
  },
  {
    id: "banking",
    label: "Banking",
    emoji: "🏦",
    groups: [
      {
        name: "Banking",
        topics: [
          "Retail Banking",
          "Corporate Banking",
          "RBI",
          "Banking Operations",
          "Credit Analysis",
          "Loan Processing",
          "KYC",
          "AML",
          "Financial Products",
        ],
      },
    ],
  },
  {
    id: "aptitude",
    label: "General Aptitude",
    emoji: "📚",
    groups: [
      {
        name: "Aptitude & HR",
        topics: [
          "Logical Reasoning",
          "Quantitative Aptitude",
          "Verbal Ability",
          "English Communication",
          "Group Discussion",
          "HR Interview",
          "Personality Assessment",
        ],
      },
    ],
  },
  {
    id: "professional",
    label: "Other Professional Domains",
    emoji: "👨‍⚕️",
    groups: [
      {
        name: "Professional",
        topics: [
          "Mechanical Engineering",
          "Civil Engineering",
          "Electrical Engineering",
          "Electronics",
          "Healthcare",
          "Nursing",
          "Pharmacy",
          "Teaching",
          "Law",
          "Hotel Management",
          "Aviation",
          "Agriculture",
          "Architecture",
          "Design",
          "Journalism",
        ],
      },
    ],
  },
];

export const CUSTOM_TOPIC_EXAMPLES = [
  "Power BI",
  "Tableau",
  "SAP",
  "Salesforce",
  "CAT Preparation",
  "UPSC",
  "Banking Exams",
  "Data Analyst",
  "Accountant",
  "HR Executive",
  "Marketing Manager",
  "Business Analyst",
  "AI Engineer",
  "Blockchain",
  "Flutter",
  "Django",
];

export interface TopicHit {
  topic: string;
  category: string;
  group: string;
}

export const ALL_TOPICS: TopicHit[] = INTERVIEW_CATEGORIES.flatMap((c) =>
  c.groups.flatMap((g) =>
    g.topics.map((t) => ({ topic: t, category: `${c.emoji} ${c.label}`, group: g.name })),
  ),
);

export function searchTopics(query: string, limit = 60): TopicHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const seen = new Set<string>();
  const out: TopicHit[] = [];
  for (const hit of ALL_TOPICS) {
    const key = hit.topic.toLowerCase();
    if (seen.has(key)) continue;
    if (key.includes(q) || hit.group.toLowerCase().includes(q) || hit.category.toLowerCase().includes(q)) {
      seen.add(key);
      out.push(hit);
      if (out.length >= limit) break;
    }
  }
  return out;
}
