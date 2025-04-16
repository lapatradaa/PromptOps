// utils/system-content-generator.ts

import { ProjectType, ShotType, SystemPrompt } from "../types";

export function generateSystemPrompt(
  projectType: ProjectType,
  shotType: ShotType,
  hasContext: boolean = false
): SystemPrompt {

  // For sentiment analysis projects
  if (projectType === 'sentiment') {
    switch (shotType) {
      case 'Zero Shot':
        return {
          type: 'default',
          defaultPrompt: 'You are an assistant that classifies the sentiment of the message into positive, negative, and neutral.',
        };
      case 'One Shot':
        return {
          type: 'default',
          defaultPrompt: `You are an assistant that classifies the sentiment of the message into positive, negative, and neutral. Given below is an example of the sentiment analysis task.
          Sentence: I had a bad experience
          Sentiment: Negative.`
        };
      case 'Few Shot':
        return {
          type: 'default',
          defaultPrompt: `You are an assistant that classifies the sentiment of the message into positive, negative, and neutral. Given below are a few examples of the sentiment analysis task.
          Sentence: I had a bad experience
          Sentiment: Negative
          Sentence: The food was not bad
          Sentiment: Neutral
          Sentence: The movie was impressive.
          Sentiment: Positive.`
        };
      default:
        return { type: 'default', };
    }
  }

  // For QA projects
  if (projectType === 'qa') {
    const basePrompt = 'You will act like a question-answering system that answers the given question.';

    // Zero Shot QA
    if (shotType === 'Zero Shot') {
      return {
        type: 'default',
        defaultPrompt: basePrompt,
        withContext: hasContext // Use the withContext flag instead of type
      };
    }

    // One Shot QA 
    if (shotType === 'One Shot') {
      if (hasContext) {
        return {
          type: 'default',
          defaultPrompt: `${basePrompt} Given below is an example of the question-answering task and its context.
          Context: Depression is caused by low levels of serotonin, dopamine and norepinephrine. Monoamine Oxidase breaks down neurotransmitters and lowers levels of serotonin, dopamine and norepinephrine.
          Question: Would a Monoamine Oxidase candy bar cheer up a depressed friend?
          Answer: No`,
          withContext: true
        };
      } else {
        return {
          type: 'default',
          defaultPrompt: `${basePrompt} Given below is an example of the question-answering task.
          Question: Would a Monoamine Oxidase candy bar cheer up a depressed friend?
          Answer: No`,
          withContext: false
        };
      }
    }

    // Few Shot QA
    if (shotType === 'Few Shot') {
      if (hasContext) {
        return {
          type: 'default',
          defaultPrompt: `${basePrompt} Given below are examples of the question-answering task and their context.
          Context: Depression is caused by low levels of serotonin, dopamine and norepinephrine. Monoamine Oxidase breaks down neurotransmitters and lowers levels of serotonin, dopamine and norepinephrine.
          Question: Would a Monoamine Oxidase candy bar cheer up a depressed friend?
          Answer: No
          Context: Grey seals have no ear flaps and their ears canals are filled with wax. Grey seals hear better underwater when their ears open like a valve. Dogs have sensitive ears that can hear as far as a quarter of a mile away.
          Question: Would a dog respond to bell before Grey seal?
          Answer: Yes
          Context: A pound sterling is fiat money. Fiat money is backed by government decree and has no intrinsic value. One pound sterling is worth about 1.24 US dollars by May of 2020.
          Question: Is a pound sterling valuable?
          Answer: No`,
          withContext: true
        };
      } else {
        return {
          type: 'default',
          defaultPrompt: `${basePrompt} Given below is an example of the question-answering task.
          Question: Would a Monoamine Oxidase candy bar cheer up a depressed friend?
          Answer: No
          Question: Would a dog respond to bell before Grey seal?
          Answer: Yes
          Question: Is a pound sterling valuable?
          Answer: No`,
          withContext: false
        };
      }
    }
  }

  // Default fallback
  return { type: 'default' };
}