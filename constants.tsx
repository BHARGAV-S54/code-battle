
import React from 'react';
import { Problem } from './types';

export const INITIAL_PROBLEMS: Problem[] = [
  {
    id: 'p1',
    title: 'Multi-Lingual FizzBuzz',
    difficulty: 'Easy',
    description: 'Read an integer `n` from standard input. For each integer `i` from 1 to `n` (inclusive), print a value to a new line:\n- "FizzBuzz" if `i` is divisible by 3 and 5.\n- "Fizz" if `i` is divisible by 3.\n- "Buzz" if `i` is divisible by 5.\n- The value of `i` itself if none of the above apply.',
    constraints: ['1 <= n <= 10^4'],
    testCases: [
      { id: 'tc1', input: '3', expectedOutput: '1\n2\nFizz' },
      { id: 'tc2', input: '5', expectedOutput: '1\n2\nFizz\n4\nBuzz' },
      { id: 'tc3', input: '15', expectedOutput: '1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz' }
    ]
  },
  {
    id: 'p2',
    title: 'The Anagram Detector',
    difficulty: 'Easy',
    description: 'Read two strings `s` and `t` from standard input (each on a new line). Output "true" if `t` is an anagram of `s`, and "false" otherwise.\n\nAn anagram is formed by rearranging letters. For example, "silent" and "listen" are anagrams.',
    constraints: ['1 <= s.length, t.length <= 5000', 'Strings contain lowercase English letters.'],
    testCases: [
      { id: 'tc1', input: 'anagram\nnagaram', expectedOutput: 'true' },
      { id: 'tc2', input: 'rat\ncar', expectedOutput: 'false' }
    ]
  },
  {
    id: 'p3',
    title: 'Bracket Balance',
    difficulty: 'Easy',
    description: 'Read a string containing only parentheses "()", "[]", and "{}" from standard input. Output "true" if the brackets are balanced and correctly nested, otherwise output "false".',
    constraints: ['1 <= string length <= 10^4'],
    testCases: [
      { id: 'tc1', input: '()[]{}', expectedOutput: 'true' },
      { id: 'tc2', input: '([)]', expectedOutput: 'false' },
      { id: 'tc3', input: '{[]}', expectedOutput: 'true' }
    ]
  },
  {
    id: 'p4',
    title: 'The Staircase Problem',
    difficulty: 'Medium',
    description: 'You are climbing a staircase with `n` steps. Each time you can climb 1 or 2 steps. Read `n` from standard input and output the number of distinct ways to reach the top.',
    constraints: ['1 <= n <= 40'],
    testCases: [
      { id: 'tc1', input: '2', expectedOutput: '2' },
      { id: 'tc2', input: '3', expectedOutput: '3' },
      { id: 'tc3', input: '10', expectedOutput: '89' }
    ]
  },
  {
    id: 'p5',
    title: 'Maximum Continuous Sum',
    difficulty: 'Medium',
    description: 'Read an array of integers from standard input. The first line contains the size of the array `n`. The second line contains `n` space-separated integers. Output the maximum sum of a contiguous subarray.',
    constraints: ['1 <= n <= 10^5', '-10^4 <= value <= 10^4'],
    testCases: [
      { id: 'tc1', input: '9\n-2 1 -3 4 -1 2 1 -5 4', expectedOutput: '6' },
      { id: 'tc2', input: '5\n5 4 -1 7 8', expectedOutput: '23' }
    ]
  }
];

export const Icons = {
  Code: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  ),
  Lock: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  ),
  Play: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Timer: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Trophy: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
    </svg>
  ),
  Users: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 01-9-3.812" />
    </svg>
  ),
  ArrowRight: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
    </svg>
  ),
  CheckCircle: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  XCircle: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Logout: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  )
};
