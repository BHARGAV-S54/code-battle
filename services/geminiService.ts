
import { GoogleGenAI, Type } from "@google/genai";
import { Problem, TestCase } from "../types";

export const evaluateCode = async (
  code: string,
  problem: Problem,
  language: string = 'javascript'
) => {
  // Always create a new instance to ensure the latest API key is used
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    You are a world-class competitive programming judge (like Codeforces/LeetCode) and a senior code auditor.
    
    PROBLEM: ${problem.title}
    DESCRIPTION: ${problem.description}
    CONSTRAINTS: ${problem.constraints.join(', ')}
    
    EXPECTED TEST CASES (Input/Output Pairs):
    ${JSON.stringify(problem.testCases)}

    SUBMITTED CODE:
    \`\`\`${language}
    ${code}
    \`\`\`
    
    YOUR MISSION:
    1. Execution Simulation: Mentally execute the code against EVERY provided test case. Check for exact string matching on output.
    2. Logic Review: Check for edge cases, potential time complexity issues (O(N^2) where O(N) is required), and memory usage.
    3. Qualitative Analysis: Look for clean code practices, meaningful variable names, and algorithmic correctness.
    
    SCORING CRITERIA:
    - "totalScore": Percentage (0-100) based strictly on how many test cases pass simulation.
    - "aiScore": Percentage (0-100) representing the quality of the algorithm and code structure.
    
    OUTPUT: Return ONLY a valid JSON object.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 32768 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            results: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  testCaseId: { type: Type.STRING },
                  passed: { type: Type.BOOLEAN },
                  actualOutput: { type: Type.STRING },
                  error: { type: Type.STRING, nullable: true }
                },
                required: ['testCaseId', 'passed', 'actualOutput']
              }
            },
            totalScore: { type: Type.NUMBER, description: 'Percentage of passed test cases' },
            aiScore: { type: Type.NUMBER, description: 'Qualitative quality score' },
            aiFeedback: { type: Type.STRING, description: 'Detailed expert feedback for the admin' }
          },
          required: ['results', 'totalScore', 'aiScore', 'aiFeedback']
        }
      }
    });

    if (!response.text) throw new Error("Empty response from AI");
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini Evaluation Critical Error:", error);
    // Return a graceful failure state for the UI
    return {
      results: problem.testCases.map(tc => ({
        testCaseId: tc.id,
        passed: false,
        actualOutput: "Execution Engine Timeout",
        error: "Internal Processing Error"
      })),
      totalScore: 0,
      aiScore: 0,
      aiFeedback: "The AI evaluator encountered an error while processing your logic. Please check your syntax and try again."
    };
  }
};
