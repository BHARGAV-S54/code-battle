
export enum UserRole {
  ADMIN = 'ADMIN',
  TEAM = 'TEAM'
}

export enum ContestStatus {
  LOCKED = 'LOCKED',
  ACTIVE = 'ACTIVE',
  FINISHED = 'FINISHED'
}

export interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
}

export interface Problem {
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  description: string;
  constraints: string[];
  testCases: TestCase[];
}

export interface Submission {
  id: string;
  teamId: string;
  problemId: string;
  code: string;
  language: string;
  timestamp: number;
  results: {
    testCaseId: string;
    passed: boolean;
    actualOutput: string;
    error?: string;
  }[];
  score: number; // Test case based score
  aiScore?: number; // Qualitative AI evaluation score
  aiFeedback?: string; // Qualitative AI feedback
  proctorViolations?: number; // Count of tab switches during this attempt
}

export interface Team {
  id: string;
  name: string;
  password?: string; // Admin defined password
  members: string[];
  assignedProblemId?: string;
  totalScore: number;
  lastSubmissionTime?: number;
  violations: number; // Total proctoring violations
}

export interface ContestState {
  status: ContestStatus;
  startTime?: number;
  durationMinutes: number;
  problemBank: Problem[];
}
