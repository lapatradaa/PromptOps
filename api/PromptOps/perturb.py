# api/PromptOps/perturb.py

import random
import string
import math
import pandas as pd
import os
import nltk
from nltk.tokenize import word_tokenize
from nltk.corpus import wordnet
from nltk import pos_tag
from textblob import TextBlob
from PyDictionary import PyDictionary  # Switch back to PyDictionary
import spacy
import re
from nltk.corpus import wordnet as wn
import requests  # for llama lmstudio llm
import spacy
import inflect

nlp = spacy.load("en_core_web_sm")

dictionary = PyDictionary()  # Initialize PyDictionary

class QuestionConverter:
    def __init__(self):
        self.nlp = spacy.load("en_core_web_sm")
        self.inflect_engine = inflect.engine()

        # Mapping of auxiliary verbs to their passive forms
        self.aux_mapping = {
            'do': 'is',
            'does': 'is',
            'did': 'was',
            'will': 'will be',
            'can': 'can be',
            'could': 'could be',
            'should': 'should be',
            'would': 'would be',
            'might': 'might be',
            'must': 'must be'
        }

        # Common irregular verb past participles
        self.irregular_verbs = {
            'eat': 'eaten',
            'teach': 'taught',
            'draw': 'drawn',
            'drink': 'drunk',
            'drive': 'driven',
            'give': 'given',
            'know': 'known',
            'see': 'seen',
            'show': 'shown',
            'speak': 'spoken',
            'take': 'taken',
            'write': 'written',
            'break': 'broken',
            'choose': 'chosen',
            'forget': 'forgotten',
            'get': 'gotten',
            'hide': 'hidden',
            'make': 'made',
            'mean': 'meant',
            'pay': 'paid',
            'put': 'put',
            'read': 'read',
            'say': 'said',
            'sell': 'sold',
            'send': 'sent',
            'sing': 'sung',
            'sit': 'sat',
            'tell': 'told',
            'think': 'thought',
            'clean': 'cleaned'
        }

    def get_past_participle(self, verb):
        """Convert a verb to its past participle form"""
        verb = verb.lower()
        # Check irregular verbs first
        if verb in self.irregular_verbs:
            return self.irregular_verbs[verb]

        # Handle regular verbs
        if verb.endswith('e'):
            return verb + 'd'
        elif verb.endswith('y'):
            if verb[-2] not in 'aeiou':
                return verb[:-1] + 'ied'
            else:
                return verb + 'ed'
        elif len(verb) > 2 and verb[-1] not in 'aeiou' and verb[-2] in 'aeiou' and verb[-3] not in 'aeiou':
            return verb + verb[-1] + 'ed'
        else:
            return verb + 'ed'

    def should_use_are(self, noun_phrase):
        """Determine if 'are' should be used instead of 'is'"""
        # Check if the noun is plural
        if self.inflect_engine.plural_noun(noun_phrase.split()[-1]):
            return True

        # Handle uncountable nouns (like "software")
        uncountable_nouns = {'software', 'information',
                             'knowledge', 'research', 'equipment', 'furniture'}
        if noun_phrase.split()[-1].lower() in uncountable_nouns:
            return False

        return False

    def convert_question(self, question):
        """
        Convert a question from active to passive voice.

        Args:
            question (str): Input question in active voice

        Returns:
            str: Converted question in passive voice
        """
        # Parse the question
        doc = self.nlp(question)

        # Extract components
        words = [token.text for token in doc]
        first_word = words[0].lower()

        # Find the main verb and object
        root_verb = None
        subject = None
        obj = None
        determiners = []

        for token in doc:
            if token.dep_ == "ROOT" and not root_verb:
                root_verb = token
            if token.dep_ == "nsubj" and not subject:
                subject = token
            if token.dep_ == "dobj" and not obj:
                obj = token
            if token.dep_ == "det" and token.head == obj:
                determiners.append(token)

        # Handle cases where parsing might have failed
        if not all([root_verb, subject, obj]):
            return question

        # Preserve determiners (like "the") with the object
        obj_phrase = obj.text
        if determiners:
            obj_phrase = f"{determiners[0].text} {obj_phrase}"

        # Get the correct form of "be" based on the original auxiliary
        new_aux = self.aux_mapping.get(first_word, 'is')

        # Handle "is" vs "are"
        if new_aux == 'is' and self.should_use_are(obj_phrase):
            new_aux = 'are'
        elif new_aux == 'was' and self.should_use_are(obj_phrase):
            new_aux = 'were'

        # Get past participle of the main verb
        past_participle = self.get_past_participle(root_verb.text)

        # Convert pronouns if necessary
        subject_phrase = subject.text
        if subject_phrase.lower() in ['i', 'you', 'he', 'she', 'we', 'they']:
            pronoun_map = {
                'i': 'me', 'you': 'you', 'he': 'him', 'she': 'her',
                'we': 'us', 'they': 'them'
            }
            subject_phrase = pronoun_map.get(
                subject_phrase.lower(), subject_phrase)

        # Extract any additional context (time, place, manner, etc.) after the object
        additional_context = ' '.join(words[words.index(
            obj.text) + 1:-1]) if words.index(obj.text) < len(words) - 1 else ''

        # Reconstruct the question
        if additional_context:
            passive = f"{new_aux} {obj_phrase} {past_participle} by {subject_phrase} {additional_context}?"
        else:
            passive = f"{new_aux} {obj_phrase} {past_participle} by {subject_phrase}?"

        # Capitalize first letter
        return passive[0].upper() + passive[1:]


def get_synonym(word, pos):
    """Fetches a synonym for a given word based on its POS tag using WordNet."""
    synonyms = set()

    # Map NLTK POS tags to WordNet POS tags
    wn_pos_map = {
        'NN': wn.NOUN, 'NNS': wn.NOUN, 'NNP': wn.NOUN, 'NNPS': wn.NOUN,  # Nouns
        'VB': wn.VERB, 'VBD': wn.VERB, 'VBG': wn.VERB, 'VBN': wn.VERB, 'VBP': wn.VERB, 'VBZ': wn.VERB,  # Verbs
        'JJ': wn.ADJ, 'JJR': wn.ADJ, 'JJS': wn.ADJ,  # Adjectives
        'RB': wn.ADV, 'RBR': wn.ADV, 'RBS': wn.ADV   # Adverbs
    }

    # Get WordNet POS type if available
    wn_pos = wn_pos_map.get(pos, None)

    # Fetch synonyms if a valid POS is found
    if wn_pos:
        for syn in wn.synsets(word, pos=wn_pos):
            for lemma in syn.lemmas():
                if lemma.name() != word.replace("_", " "):  # Exclude original word
                    # Replace underscores with spaces
                    synonyms.add(lemma.name().replace("_", " "))

    # Return synonym if found, else original word
    return random.choice(list(synonyms)) if synonyms else word


class Perturbation:
    def __init__(self):
        # self.nlp = spacy.load("en_core_web_sm") small model

        self.nlp = spacy.load("en_core_web_lg")
        # coreferee.add_to_pipe(self.nlp)
        self.dictionary = PyDictionary()
        self.nlp.add_pipe("coreferee")

        # Initialize verb processor
        self.question_converter = QuestionConverter()

        # Initialize time indicators
        self.time_indicators = {
            "today", "yesterday", "tomorrow", "soon", "now",
            "next week", "last year", "earlier", "later", "by",
            "this morning", "this evening", "tonight", "last night"
        }

        # Try to load dataset if available
        self.dataset = None
        dataset_path = os.path.join(os.path.dirname(
            __file__), "active_to_passive_dataset.csv")
        if os.path.exists(dataset_path):
            try:
                self.dataset = pd.read_csv(dataset_path)
            except Exception as e:
                print(f"Warning: Could not load dataset: {e}")

    def robust(self, text, num):
        """
        Create multiple sentences where each sentence has exactly one different word perturbed.

        Args:
            text: The input text to modify
            num: Percentage (1-100) of words to apply swapping to

        Returns:
            A list of sentences where each sentence has one different word with character swaps
        """
        words = text.split()  # Split the text into words
        perturbed_sentences = []  # List to store sentences with perturbed words

        # Find eligible words (words with length >= 2)
        eligible_words = [i for i, word in enumerate(
            words) if len(word.rstrip(string.punctuation)) >= 2]

        if not eligible_words:
            return [text]  # Return original text if no eligible words

        # Calculate how many words to swap based on percentage
        num = max(1, min(100, num))  # Ensure num is between 1 and 100
        words_to_swap = math.ceil(len(eligible_words) * (num / 100.0))
        # Can't swap more than available words
        words_to_swap = min(words_to_swap, len(eligible_words))

        # Randomly select which words to swap
        words_indices_to_swap = random.sample(eligible_words, words_to_swap)

        # For each selected word index, create a separate sentence with only that word perturbed
        for word_index in words_indices_to_swap:
            # Create a copy of the original words for this perturbation
            modified_words = words.copy()

            word = words[word_index]

            # Check for punctuation at the end
            if word[-1] in string.punctuation:
                core_word = word[:-1]
                punctuation = word[-1]
            else:
                core_word = word
                punctuation = ''

            # Only swap if the core word is at least 2 characters
            if len(core_word) >= 2:
                # Choose a random index to swap characters
                swap_index = random.randint(0, len(core_word) - 2)

                # Swap characters
                perturbed_word = (
                    core_word[:swap_index] +
                    core_word[swap_index + 1] +
                    core_word[swap_index] +
                    core_word[swap_index + 2:]
                )

                # Reattach punctuation
                perturbed_word += punctuation

                # Replace the word in our copy
                modified_words[word_index] = perturbed_word

            # Create a new sentence with the one modified word
            perturbed_sentence = ' '.join(modified_words)
            perturbed_sentences.append(perturbed_sentence)

        return perturbed_sentences

    def process_questions(self, df, question_column, expected_answer_column, num):
        """
        Processes the dataset, applies perturbations to each question, and matches with the expected answers.
        Fixed to handle non-string data types.

        Args:
            df (pd.DataFrame): Input dataframe with columns containing questions and expected answers.
            question_column (str): Column name containing the questions.
            expected_answer_column (str): Column name containing the expected answers.
            num (int): Percentage (1-100) of words to apply swapping to

        Returns:
            pd.DataFrame: A new dataframe with the original question, perturbations, and expected answers.
        """
        import pandas as pd
        import logging

        # Initialize lists to store results
        rows = []

        # First, ensure the columns exist
        if question_column not in df.columns or expected_answer_column not in df.columns:
            raise ValueError(
                f"Required columns missing: {question_column} or {expected_answer_column}")

        for index, row in df.iterrows():
            # Convert to string to handle non-string types (like float)
            try:
                question = str(row[question_column])
                expected_answer = str(row[expected_answer_column])

                # Skip empty questions
                if not question or question.lower() == 'nan':
                    logging.warning(f"Skipping row {index}: Empty question")
                    continue

                # Generate perturbations using the robust method
                perturbed_set = self.robust(question, num)

                # Add each perturbation as a new row in the output
                for i, perturbation in enumerate(perturbed_set, start=1):
                    rows.append({
                        "Original_Question_Index": index,
                        "Original_Question": question,
                        # Ensure unique naming
                        "Perturbation": f"Perturb {index}-{i}",
                        "Perturbed_Question": perturbation,
                        "Expected_Answer": expected_answer
                    })
            except Exception as e:
                logging.error(f"Error processing row {index}: {e}")
                # Continue with other rows instead of failing
                continue

        # If no rows were processed, raise an error
        if not rows:
            raise ValueError("No valid questions found in the dataset")

        # Convert to DataFrame
        result_df = pd.DataFrame(rows)
        return result_df

    def taxonomy(self, sentence):
        """Replaces exactly one word in a sentence with its synonym (if available)."""
        # Tokenize and tag the sentence
        tokens = word_tokenize(sentence)
        tagged = pos_tag(tokens)

        # Filter for words that might have synonyms (excluding stopwords, punctuation, etc.)
        eligible_words = []
        for i, (word, tag) in enumerate(tagged):
            # Check if the word is long enough and has a valid POS tag for synonym replacement
            if len(word) > 3 and tag in ['NN', 'NNS', 'NNP', 'NNPS', 'VB', 'VBD', 'VBG',
                                         'VBN', 'VBP', 'VBZ', 'JJ', 'JJR', 'JJS', 'RB', 'RBR', 'RBS']:
                eligible_words.append(i)

        # If no eligible words found, return the original sentence
        if not eligible_words:
            return sentence

        # Randomly select one word to replace
        word_index = random.choice(eligible_words)
        word, tag = tagged[word_index]

        # Get synonym for the selected word
        synonym = get_synonym(word, tag)

        # Replace only if a different synonym was found
        if synonym != word:
            tokens[word_index] = synonym

        # Reconstruct the sentence with the single word replaced
        new_sentence = ' '.join(tokens)
        return new_sentence

    def negation(self, text):
        """
        Modifies the sentence to negate its meaning:

        - If "not" or "n't" is present, replaces the next adjective or adverb with its antonym (if available).
        - If "not" or "n't" is absent, inserts "not" before an adjective or adverb and replaces it with its antonym.
        - Does NOT remove or modify verbs.

        :param text: The input sentence.
        :return: A negated version of the sentence.
        """
        def antonyms_for(word):
            """
            Find antonyms for a given word across all parts of speech.

            :param word: The word for which to find antonyms.
            :return: A set of antonyms for the given word.
            """
            antonyms = set()
            for ss in wn.synsets(word):
                for lemma in ss.lemmas():
                    for antonym in lemma.antonyms():
                        antonyms.add(antonym.name())
            return antonyms
        tokens = word_tokenize(text)
        tagged = pos_tag(tokens)

        result = []
        skip_next = False  # Flag to skip the next word after negation handling
        negation_found = False

        for i, (word, tag) in enumerate(tagged):
            if skip_next:
                skip_next = False
                continue

            # Handle existing negation by replacing the next adjective/adverb with its antonym
            if word.lower() in ["not", "n't"]:
                if i + 1 < len(tagged):
                    next_word, next_tag = tagged[i + 1]
                    if next_tag.startswith(("JJ", "RB")):  # Adjectives, adverbs
                        antonyms = antonyms_for(next_word)
                        if antonyms:
                            result.append(list(antonyms)[0])
                        else:
                            result.append(next_word)
                        skip_next = True
                negation_found = True
            else:
                result.append(word)

        # If no negation was found, add "not" before an adjective or adverb
        if not negation_found:
            for i, (word, tag) in enumerate(tagged):
                if tag.startswith(("JJ", "RB")):  # Adjectives, adverbs (not verbs)
                    antonyms = antonyms_for(word)
                    if antonyms:
                        result.insert(i, "not")
                        result[i + 1] = list(antonyms)[0]
                        break  # Only add negation once

        # Join tokens and fix spacing
        transformed_text = " ".join(result)
        transformed_text = re.sub(r'\s+([?.!,"])', r'\1', transformed_text)

        return transformed_text

    def coreference(self, text):
        """
        Resolves coreferences in the given text using the loaded NLP model with coreference resolution capabilities.

        Args:
            text (str): The input text to process.

        Returns:
            str: The text with resolved coreferences.
        """
        try:
            # Process the text with the NLP model
            doc = self.nlp(text)

            # If no coreference chains exist, return the original text
            if not doc._.coref_chains:
                return text

            # Use coreference chains to resolve references
            resolved_text = []
            for token in doc:
                if token.is_punct:
                    # Preserve punctuation as-is
                    resolved_text.append(token.text)
                else:
                    # Attempt to resolve the token
                    resolved_token = doc._.coref_chains.resolve(token)
                    if resolved_token:
                        # Use the first resolved token's text
                        resolved_text.append(resolved_token[0].text)
                    else:
                        # Use the original token if no resolution exists
                        resolved_text.append(token.text)

            # Join resolved text and fix spacing around punctuation
            resolved_text = " ".join(resolved_text)
            # Fix spaces before punctuation
            resolved_text = re.sub(r'\s+([?.!,"])', r'\1', resolved_text)
            return resolved_text.strip()
        except Exception as e:
            # Log and handle any errors, returning the original text as a fallback
            print(f"Coreference resolution error: {e}")
            return text

    def srl(self, sentence: str) -> str:
        """
        Performs SRL perturbation by converting active voice to passive voice.

        Args:
            sentence (str): Input sentence to perturb.

        Returns:
            str: Perturbed sentence in passive voice if conversion is possible.
        """
        passive_sentence = self.question_converter.convert_question(sentence)

        # If conversion fails, return a fallback message
        if passive_sentence.lower() == sentence.lower():
            return "Could not convert to passive voice."

        return passive_sentence.capitalize()

    def logic(self, sentence):
        """
        Transforms a sentence with an 'if...then...' structure by swapping the condition and conclusion.

        Args:
            sentence (str): Input sentence with 'if...then...' structure.

        Returns:
            str: Transformed sentence with swapped condition and conclusion.
        """
        # Check if the sentence contains "if...then..."
        match = re.search(r'if (.*), then (.*)', sentence, re.IGNORECASE)
        if match:
            condition = match.group(1).strip().rstrip('.')
            conclusion = match.group(2).strip().rstrip('.')

            # Swap the condition and conclusion
            transformed_sentence = f"If {conclusion}, then {condition}"
            return transformed_sentence

        # If no 'if...then...' is found, return the original sentence with a note
        return "No 'if...then...' structure found in the sentence."

    def fairness(self, sentence):
        """
        Adds gender-specific words ('female' or 'male') to a sentence if no gender word is present.
        If the main noun is not human, adds nationality-specific words ('American', 'Japanese', 'Korean', etc.) instead.

        Args:
            sentence (str): Input sentence.

        Returns:
            str: Sentence with added gender or nationality word if none is present.
        """
        # Define gender-specific and nationality-specific words
        gender_words = {"female", "male", "woman", "man",
                        "girl", "boy", "she", "he", "her", "his"}
        nationality_words = ["American", "Japanese", "Korean",
                             "Indian", "Canadian", "Brazilian", "German"]

        # Tokenize and tag parts of speech
        tokens = word_tokenize(sentence)
        tagged = pos_tag(tokens)

        # Check if the sentence already contains a gender word
        if any(word.lower() in gender_words for word in tokens):
            return sentence  # Return original sentence if gender word exists

        # Identify the main noun and check if it is human
        main_noun = None
        for word, tag in tagged:
            if tag in {"NN", "NNS", "NNP", "NNPS"}:  # Nouns
                main_noun = word
                break

        # Check if the main noun is human using WordNet
        if main_noun:
            synsets = wn.synsets(main_noun, pos=wn.NOUN)
            if synsets:
                for synset in synsets:
                    if "person" in synset.lexname():
                        # Main noun is human, add a gender word
                        gender_word = random.choice(
                            ["female", "male", "American", "Japanese"])
                        tokens.insert(tokens.index(main_noun), gender_word)
                        # Ensure no space before punctuation
                        return re.sub(r'\s+([?.!,"])', r'\1', " ".join(tokens))

            # Main noun is not human, add a nationality word
            nationality_word = random.choice(nationality_words)
            tokens.insert(tokens.index(main_noun), nationality_word)
            # Ensure no space before punctuation
            return re.sub(r'\s+([?.!,"])', r'\1', " ".join(tokens))

        # If no main noun is found, prepend a nationality word
        nationality_word = random.choice(nationality_words)
        # Ensure no space before punctuation
        return re.sub(r'\s+([?.!,"])', r'\1', f"{nationality_word} {sentence}")

    def correct_grammar(self, text):
        """
        Corrects grammar using LanguageTool's public API.

        Args:
            text (str): Input text.

        Returns:
            str: Text with corrected grammar.
        """
        url = "https://api.languagetool.org/v2/check"
        params = {
            'text': text,
            'language': 'en-US'
        }
        response = requests.post(url, data=params)
        if response.status_code == 200:
            matches = response.json().get('matches', [])
            for match in matches:
                replacements = match.get('replacements', [])
                if replacements:
                    replacement = replacements[0].get('value', '')
                    start = match['offset']
                    end = start + match['length']
                    text = text[:start] + replacement + text[end:]
            return text
        else:
            return text  # Return original text if API fails

    def temporal(self, sentence):
        """
        Transforms present tense sentences into temporal context by adding past statements
        with opposite sentiment. Ensures the sentence is lowercased and contextual.

        Args:
            sentence (str): Input sentence.

        Returns:
            str: Temporally transformed sentence.
        """
        def get_antonym(word):
            """Retrieve an antonym for the given word."""
            antonyms = set()
            for synset in wn.synsets(word):
                for lemma in synset.lemmas():
                    if lemma.antonyms():
                        antonyms.add(lemma.antonyms()[0].name())
            return random.choice(list(antonyms)) if antonyms else None

        def find_subject(sentence):
            """Find the main subject (noun/proper noun) of the sentence."""
            doc = self.nlp(sentence)
            for token in doc:
                if token.dep_ in {"nsubj", "pobj", "dobj"} and token.pos_ in {"NOUN", "PROPN"}:
                    return token.text
            return "it"  # Fallback if no subject is found

        # Lowercase the sentence
        sentence = sentence.lower()

        # Detect tense and sentiment-related words
        doc = self.nlp(sentence)
        tense = None
        sentiment_word = None
        for token in doc:
            if token.tag_ in {'VBP', 'VBZ'}:  # Present tense verbs
                tense = 'present'
            # Find sentiment words (adjective/adverb)
            if token.pos_ in {"ADJ", "ADV"}:
                sentiment_word = token.text

        # If sentence is not present tense, return as is
        if tense != 'present':
            return sentence.capitalize()

        # Find antonym for the sentiment word
        antonym = get_antonym(sentiment_word) if sentiment_word else None
        subject = find_subject(sentence)

        # Construct the transformed sentence

        past_phrase = f"Not sure how it was like before"
        # past_phrase = f"{subject} used to be {antonym}" if antonym else f"{subject} was not {sentiment_word}"
        # else:

        transformed_sentence = f"{past_phrase} but {sentence}."
        return transformed_sentence.capitalize()

    def ner(self, sentence):
        """
        Replaces location names (GPE entities) in the input sentence with another location name.

        Args:
            sentence (str): Input sentence.

        Returns:
            str: Sentence with location names replaced.
        """
        # List of alternative locations
        location_names = ["Canada", "Australia", "Germany",
                          "France", "India", "Japan", "Brazil"]

        # Parse the sentence using SpaCy
        doc = nlp(sentence)

        # Reconstruct the sentence with replaced locations
        transformed_tokens = []
        for token in doc:
            if token.ent_type_ == "GPE":  # Check if the token is a location
                new_location = random.choice(location_names)
                transformed_tokens.append(new_location)
            else:
                transformed_tokens.append(token.text)

        # Join tokens and fix spaces before punctuation
        transformed_sentence = " ".join(transformed_tokens)
        # Fix spaces before punctuation
        transformed_sentence = re.sub(
            r'\s+([?.!,"])', r'\1', transformed_sentence)
        return transformed_sentence

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
        """
        Insert an adjective or adverb into a sentence at an appropriate position,
        but not at the beginning of the sentence.
        Removes underscores from words before insertion.
        """
        tokens = word_tokenize(sentence)
        word, pos_tag = self.get_random_adjective_or_adverb()

        if not word:
            return sentence  # Return original sentence if no word was found

        # Remove underscores from the word if present
        word = word.replace('_', ' ')

        tagged = nltk.pos_tag(tokens)

        # Skip the first token to avoid adding at the beginning
        insertion_made = False

        if pos_tag == 'JJ':  # If we have an adjective
            # Start from the second token (index 1)
            for i in range(1, len(tagged)):
                token, tag = tagged[i]
                # Insert before nouns
                if tag in ['NN', 'NNS', 'NNP', 'NNPS']:
                    tokens.insert(i, word)
                    insertion_made = True
                    break

        elif pos_tag == 'RB':  # If we have an adverb
            # Start from the second token (index 1)
            for i in range(1, len(tagged)):
                token, tag = tagged[i]
                # Insert after verbs
                if tag in ['VB', 'VBD', 'VBG', 'VBN', 'VBP', 'VBZ']:
                    tokens.insert(i + 1, word)
                    insertion_made = True
                    break

        # If no appropriate position was found in the middle, append to the end
        # but before any final punctuation
        if not insertion_made:
            if tokens[-1] in '.!?':
                tokens.insert(len(tokens) - 1, word)
            else:
                tokens.append(word)

        # Join tokens and clean up any double spaces that might have been created
        new_sentence = ' '.join(tokens)
        new_sentence = ' '.join(new_sentence.split())

        # Make sure there's a space before punctuation
        for punct in '.!?,:;':
            new_sentence = new_sentence.replace(' ' + punct, punct)
            new_sentence = new_sentence.replace(
                punct + ' ' + punct, punct + punct)

        return new_sentence
