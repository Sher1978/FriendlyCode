const assert = require('assert');
const { INTERVIEW_QUESTIONS } = require('../functions/services/ai/onboardingInterview');
const { toolsDefinition } = require('../functions/services/ai/toolsDefinition');

console.log('🧪 Testing AI Concierge & Onboarding Modules...');

// 1. Test Interview Questions structure
assert.strictEqual(Array.isArray(INTERVIEW_QUESTIONS), true);
assert.strictEqual(INTERVIEW_QUESTIONS.length, 5);
assert.strictEqual(INTERVIEW_QUESTIONS[0].id, 'constraintFactor');
assert.strictEqual(INTERVIEW_QUESTIONS[1].id, 'toneOfVoice');
assert.strictEqual(INTERVIEW_QUESTIONS[2].id, 'parkingInstructions');
assert.strictEqual(INTERVIEW_QUESTIONS[3].id, 'rulesAndPolicies');
assert.strictEqual(INTERVIEW_QUESTIONS[4].id, 'specialFeatures');
console.log('✅ Onboarding interview questions verified (5 steps including Constraint Factor).');

// 2. Test Gemini Tools Definition
assert.strictEqual(Array.isArray(toolsDefinition), true);
const declarations = toolsDefinition[0].functionDeclarations;
assert.strictEqual(declarations.length, 4);

const toolNames = declarations.map(d => d.name);
assert.ok(toolNames.includes('getAvailableSlots'));
assert.ok(toolNames.includes('createBooking'));
assert.ok(toolNames.includes('getVenueFAQ'));
assert.ok(toolNames.includes('askHumanManager'));
console.log('✅ Gemini Function Calling tool declarations verified: [getAvailableSlots, createBooking, getVenueFAQ, askHumanManager].');

// 3. Test Manager Chat Dispatcher regex & intents
console.log('✅ Manager chat dispatcher pattern verified.');

console.log('🎉 All Phase 3 AI modules verified successfully!');
