import random
import string
import pandas as pd
import pickle
import os
import nltk
from nltk.tokenize import word_tokenize
from nltk.corpus import wordnet
from nltk import pos_tag
from textblob import TextBlob
from PyDictionary import PyDictionary  # Switch back to PyDictionary
import spacy
import openai
import re

import requests # for llama lmstudio llm

# Download NLTK data
nltk.download('averaged_perceptron_tagger')
nltk.download('wordnet')
nltk.download('punkt')

nlp = spacy.load("en_core_web_sm")

dictionary = PyDictionary()  # Initialize PyDictionary

url = "http://127.0.0.1:8000/v1/chat/completions"

def get_wordnet_pos(treebank_tag):
    """Converts Treebank POS tags to WordNet POS tags."""
    if treebank_tag.startswith('J'):
        return wordnet.ADJ
    elif treebank_tag.startswith('V'):
        return wordnet.VERB
    elif treebank_tag.startswith('N'):
        return wordnet.NOUN
    elif treebank_tag.startswith('R'):
        return wordnet.ADV
    else:
        return wordnet.NOUN  # Default to noun if unknown

class Perturbation:
    def __init__(self):
        self.nlp = spacy.load("en_core_web_sm")
        self.dictionary = PyDictionary()

    def robust(self, text):
        """
        Swap one random character with its neighboring character in the text.
        """
        if len(text) < 2:
            return text

        index = random.randint(0, len(text) - 2)
        if text[index].isspace() or text[index + 1].isspace():
            return text  # Avoid swapping around spaces

        perturbed_text = (
            text[:index] +
            text[index + 1] +
            text[index] +
            text[index + 2:]
        )

        return perturbed_text

    def get_synonym(self, word, pos_tag):
        # Map NLTK pos tags to WordNet pos tags
        if pos_tag.startswith('JJ'):
            wn_pos = wordnet.ADJ
        elif pos_tag.startswith('RB'):
            wn_pos = wordnet.ADV
        else:
            return word

        # Find synonyms
        synonyms = wordnet.synsets(word, pos=wn_pos)
        if not synonyms:
            return word

        # Choose a synonym randomly except the original word
        synonym_words = set()
        for synset in synonyms:
            for lemma in synset.lemmas():
                if lemma.name() != word:
                    synonym_words.add(lemma.name())

        if not synonym_words:
            return word

        return random.choice(list(synonym_words))

    def taxonomy(self, sentence):
        tokens = word_tokenize(sentence)
        tagged = pos_tag(tokens)

        # Replace adjectives or adverbs with synonyms
        new_tokens = [
            self.get_synonym(word, tag) if tag in ['JJ', 'JJR', 'JJS', 'RB', 'RBR', 'RBS'] else word
            for word, tag in tagged
        ]

        new_sentence = ' '.join(new_tokens)
        return new_sentence

    def negation(self, sentence):
        blob = TextBlob(sentence)
        polarity = blob.sentiment.polarity
        if polarity < 0:
            # If the sentiment is negative, you might want to change the tone
            return "Consider rephrasing this sentence in a more positive way: " + sentence
        else:
            # Adjust informal expressions to more formal ones
            sentence = (sentence.replace("don't", "do not")
                                 .replace("can't", "cannot")
                                 .replace("won't", "will not")
                                 .replace("n't", " not")
                                 .replace("I'm", "I am")
                                 .replace("you're", "you are")
                                 .replace("he's", "he is")
                                 .replace("she's", "she is")
                                 .replace("it's", "it is")
                                 .replace("we're", "we are")
                                 .replace("they're", "they are")
                                 .replace("I've", "I have")
                                 .replace("you've", "you have")
                                 .replace("we've", "we have")
                                 .replace("they've", "they have")
                                 .replace("I'd", "I would")
                                 .replace("you'd", "you would")
                                 .replace("he'd", "he would")
                                 .replace("she'd", "she would")
                                 .replace("we'd", "we would")
                                 .replace("they'd", "they would")
                                 .replace("I'll", "I will")
                                 .replace("you'll", "you will")
                                 .replace("he'll", "he will")
                                 .replace("she'll", "she will")
                                 .replace("we'll", "we will")
                                 .replace("they'll", "they will")
                                 .replace("let's", "let us")
                                 .replace("that's", "that is")
                                 .replace("what's", "what is")
                                 .replace("here's", "here is")
                                 .replace("there's", "there is")
                                 .replace("where's", "where is")
                                 .replace("who's", "who is")
                                 .replace("how's", "how is"))

            return sentence

    # def coreference(self, question, word_to_clarify):
    #     # Fetch the word meaning using PyDictionary
    #     meaning = self.dictionary.meaning(word_to_clarify)

    #     if meaning:
    #         # Extract the first meaning from the returned dictionary
    #         detail = next(iter(meaning.values()), "No additional details available.")
    #         detail = detail[0]  # Get the first definition if multiple are available
    #         detail_text = f"who {detail.lower()}"
    #     else:
    #         detail_text = f"who {word_to_clarify} refers to: No additional details available."

    #     # Replace occurrences of the word in the question with the word and its detail
    #     detailed_question = question.replace(word_to_clarify, f"{word_to_clarify} {detail_text}")
    #     return detailed_question
    def coreference(self, question):
        """
        Automatically resolve coreferences in the question using SpaCy.
        """
        doc = self.nlp(question)
        resolved_question = question  # Start with the original question

        # Use SpaCy's entity recognition and dependency parsing to identify coreferences
        for token in doc:
            # If the token is a pronoun (like "he", "she", "it", etc.)
            if token.pos_ == 'PRON':
                # Find the token that this pronoun refers to (its antecedent)
                for possible_antecedent in doc:
                    # A simple check for the antecedent (e.g., proper noun or subject)
                    if possible_antecedent.dep_ in ("nsubj", "nsubjpass", "pobj") and possible_antecedent.i < token.i:
                        # Replace the pronoun with its antecedent in the question
                        resolved_question = resolved_question.replace(token.text, possible_antecedent.text)

        return resolved_question

    def srl(self, sentence):
        doc = self.nlp(sentence)
        clarified_sentence = []
        for token in doc:
            if token.dep_ == "nsubj":  # Subject of the sentence
                clarified_sentence.append(f"{token.text} (the subject)")
            elif token.dep_ == "dobj":  # Direct object of the verb
                clarified_sentence.append(f"{token.text} (the object)")
            elif token.pos_ == "VERB":  # Verbs indicate actions
                clarified_sentence.append(f"{token.text} (the action)")
            else:
                clarified_sentence.append(token.text)
        return " ".join(clarified_sentence)

    def logic(self, sentence):
        logic_content = "You are an assistant that Transform the following sentence into a logically structured sentence." \
                "- If sentence is a question, return it logically question structured like adding 'Is it logically true...' in the question statement or"\
                "- if sentence is a normal statement, transform it into 'If..., then... (provide some sentiment result based on sentence)'."\
                "You are prohibited from saying anything else Like here is.... "
        
        data = {
            "model": "hugging-quants/Llama-3.2-3B-Instruct-Q8_0-GGUF/llama-3.2-3b-instruct-q8_0.gguf",
            "messages": [
                {"role": "system", "content":   logic_content},
                {"role": "user", "content": sentence}
            ],
            "temperature": 0,
            "max_tokens": -1,
            "stream": False  
        }

        response = requests.post(url, json=data)

        if response.status_code == 200:
            # Extract the assistant's response content
            assistant_response = response.json()['choices'][0]['message']['content']
            return assistant_response
        else:
            return (f"Failed with status code {response.status_code}: {response.text}")
        # prompt = f"Transform the following sentence into a logically structured sentence. " \
        #          f"If it's a question, make it logically structured like 'Is it logically true that...?' or " \
        #          f"if it's a normal statement, transform it into 'If..., then... (provide some sentiment result based on sentence)'. Sentence: '{sentence}'"

        # try:
        #     response = openai.ChatCompletion.create(
        #         model="gpt-3.5-turbo",
        #         messages=[
        #             {"role": "system", "content": "You are an assistant that generates logical sentences. You are prohibited from saying anything else. You can only provide a suggested prompt."},
        #             {"role": "user", "content": prompt}
        #         ],
        #         temperature=0.5,
        #         top_p=1,
        #         max_tokens=100
        #     )
        #     return response.choices[0].message['content'].strip()

        # except Exception as e:
        #     return f"An error occurred: {e}"

    def fairness(self, sentence):
        fairness_content = "You are an assistant that Transform the following sentence into a fairness structured sentence." \
                "- If sentence is a question, return it logically question structured like adding ''Is it fair to ...?' in the question statement or"\
                "- if sentence is a normal statement, add non-biased words"\
                "You are prohibited from saying anything else Like here is.... "
        
        data = {
            "model": "hugging-quants/Llama-3.2-3B-Instruct-Q8_0-GGUF/llama-3.2-3b-instruct-q8_0.gguf",
            "messages": [
                {"role": "system", "content":   fairness_content},
                {"role": "user", "content": sentence}
            ],
            "temperature": 0,
            "max_tokens": -1,
            "stream": False  
        }

        response = requests.post(url, json=data)

        if response.status_code == 200:
            # Extract the assistant's response content
            assistant_response = response.json()['choices'][0]['message']['content']
            return assistant_response
        else:
            return (f"Failed with status code {response.status_code}: {response.text}")
        # prompt = f"Transform the following sentence into a fairness sentence. " \
        #          f"If it's a question, make it fairness structured like 'Is it fair to ...?' or " \
        #          f"if it's a normal statement, add non-biased words. Sentence: '{sentence}'"

        # try:
        #     response = openai.ChatCompletion.create(
        #         model="gpt-3.5-turbo",
        #         messages=[
        #             {"role": "system", "content": "You are an assistant that generates fairness sentences. You are prohibited from saying anything else. You can only provide a suggested prompt."},
        #             {"role": "user", "content": prompt}
        #         ],
        #         temperature=0.5,
        #         top_p=1,
        #         max_tokens=100
        #     )
        #     return response.choices[0].message['content'].strip()

        # except Exception as e:
        #     return f"An error occurred: {e}"

    def temporal(self, sentence):
        temporal_content = "You are an assistant that add temporal word into sentence. "\
                   "By randomly (random every time that generate the prompt) adding one temporal word: `today, yesterday, tomorrow, now, later, soon, this morning, this evening, next week, or last month` into a structured sentence."\
                    "You are prohibited from saying anything else Like here is...."
        
        data = {
            "model": "hugging-quants/Llama-3.2-3B-Instruct-Q8_0-GGUF/llama-3.2-3b-instruct-q8_0.gguf",
            "messages": [
                {"role": "system", "content":   temporal_content},
                {"role": "user", "content": sentence}
            ],
            "temperature": 0,
            "max_tokens": -1,
            "stream": False  
        }

        response = requests.post(url, json=data)

        if response.status_code == 200:
            # Extract the assistant's response content
            assistant_response = response.json()['choices'][0]['message']['content']
            return assistant_response
        else:
            return (f"Failed with status code {response.status_code}: {response.text}")
        # prompt = f"Add the temporal word `today, yesterday, tomorrow, now, later, soon, this morning, this evening, next week, or last month` into a structured sentence. " \
        #          f"Sentence: '{sentence}'"

        # try:
        #     response = openai.ChatCompletion.create(
        #         model="gpt-3.5-turbo",
        #         messages=[
        #             {"role": "system", "content": "You are an assistant that generates temporal sentences. You are prohibited from saying anything else. You can only provide a suggested prompt."},
        #             {"role": "user", "content": prompt}
        #         ],
        #         temperature=0.5,
        #         top_p=1,
        #         max_tokens=100
        #     )
        #     return response.choices[0].message['content'].strip()

        # except Exception as e:
        #     return f"An error occurred: {e}"

    def ner(self, sentence):
        # Process the sentence through spacy's NLP pipeline
        doc = nlp(sentence)

        # Create a list to store the enhanced words
        enhanced_sentence = []

        # Loop through the entities in the sentence
        for token in doc:
            if token.ent_type_:
                # Append the token with its entity type in the format [Entity] (Type)
                enhanced_sentence.append(f"[{token.text}] ({token.ent_type_})")
            else:
                # Append non-entity words as-is
                enhanced_sentence.append(token.text)

        # Join the enhanced words back into a sentence
        return " ".join(enhanced_sentence)

    def get_random_adjective_or_adverb(self):
        adjectives = set()
        adverbs = set()

        for synset in wordnet.all_synsets(pos=wordnet.ADJ):
            for lemma in synset.lemmas():
                adjectives.add(lemma.name())

        for synset in wordnet.all_synsets(pos=wordnet.ADV):
            for lemma in synset.lemmas():
                adverbs.add(lemma.name())

        if adjectives and random.choice([True, False]):
            word = random.choice(list(adjectives))
            pos_tag = 'JJ'
        elif adverbs:
            word = random.choice(list(adverbs))
            pos_tag = 'RB'
        else:
            return "", ""  # Return empty strings if no words are available

        return word, pos_tag

    def vocab(self, sentence):
        tokens = word_tokenize(sentence)
        word, pos_tag = self.get_random_adjective_or_adverb()

        if not word:
            return sentence  # Return original sentence if no word was found

        if pos_tag == 'JJ':
            tagged = nltk.pos_tag(tokens)
            for i, (token, tag) in enumerate(tagged):
                if tag in ['NN', 'NNS', 'NNP', 'NNPS']:
                    tokens.insert(i, word)
                    break
        elif pos_tag == 'RB':
            tagged = nltk.pos_tag(tokens)
            for i, (token, tag) in enumerate(tagged):
                if tag in ['VB', 'VBD', 'VBG', 'VBN', 'VBP', 'VBZ']:
                    tokens.insert(i + 1, word)
                    break

        new_sentence = ' '.join(tokens)
        return new_sentence
