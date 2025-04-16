import pandas as pd
import json
import os
import random
import re
import spacy
from nltk.tokenize import word_tokenize
from nltk.corpus import wordnet as wn
from nltk import pos_tag
from nltk.corpus import wordnet

from nltk import word_tokenize, pos_tag


class QuestionConverter:
    def __init__(self):
        self.nlp = spacy.load("en_core_web_sm")
        self.inflect_engine = wn

        self.aux_mapping = {
            'do': 'is', 'does': 'is', 'did': 'was', 'will': 'will be',
            'can': 'can be', 'could': 'could be', 'should': 'should be',
            'would': 'would be', 'might': 'might be', 'must': 'must be'
        }

        self.irregular_verbs = {
            'eat': 'eaten', 'teach': 'taught', 'draw': 'drawn', 'drink': 'drunk',
            'drive': 'driven', 'give': 'given', 'know': 'known', 'see': 'seen',
            'show': 'shown', 'speak': 'spoken', 'take': 'taken', 'write': 'written',
            'break': 'broken', 'choose': 'chosen', 'forget': 'forgotten', 'get': 'gotten',
            'hide': 'hidden', 'make': 'made', 'mean': 'meant', 'pay': 'paid', 'put': 'put',
            'read': 'read', 'say': 'said', 'sell': 'sold', 'send': 'sent', 'sing': 'sung',
            'sit': 'sat', 'tell': 'told', 'think': 'thought', 'clean': 'cleaned'
        }

    def get_past_participle(self, verb):
        """Convert a verb to its past participle form"""
        verb = verb.lower()
        if verb in self.irregular_verbs:
            return self.irregular_verbs[verb]
        if verb.endswith('e'):
            return verb + 'd'
        elif verb.endswith('y') and verb[-2] not in 'aeiou':
            return verb[:-1] + 'ied'
        elif len(verb) > 2 and verb[-1] not in 'aeiou' and verb[-2] in 'aeiou' and verb[-3] not in 'aeiou':
            return verb + verb[-1] + 'ed'
        else:
            return verb + 'ed'

    def convert_question(self, question):
        """Convert a question from active to passive voice."""
        doc = self.nlp(question)
        words = [token.text for token in doc]
        first_word = words[0].lower()

        root_verb, subject, obj, determiners = None, None, None, []

        for token in doc:
            if token.dep_ == "ROOT" and not root_verb:
                root_verb = token
            if token.dep_ == "nsubj" and not subject:
                subject = token
            if token.dep_ == "dobj" and not obj:
                obj = token
            if token.dep_ == "det" and token.head == obj:
                determiners.append(token)

        if not all([root_verb, subject, obj]):
            return question

        obj_phrase = f"{determiners[0].text} {obj.text}" if determiners else obj.text
        new_aux = self.aux_mapping.get(first_word, 'is')
        past_participle = self.get_past_participle(root_verb.text)

        subject_phrase = subject.text.lower()
        pronoun_map = {'i': 'me', 'you': 'you', 'he': 'him',
                       'she': 'her', 'we': 'us', 'they': 'them'}
        subject_phrase = pronoun_map.get(subject_phrase, subject_phrase)

        additional_context = ' '.join(words[words.index(
            obj.text) + 1:-1]) if words.index(obj.text) < len(words) - 1 else ''
        passive = f"{new_aux} {obj_phrase} {past_participle} by {subject_phrase}{' ' + additional_context if additional_context else ''}?"

        return passive[0].upper() + passive[1:]


def robustness(sentence):
    return f"Applicable | {sentence}"


# Taxonomy

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


def taxonomy(sentence):
    """Replaces only one word in a sentence with its synonym (if available)."""
    # Tokenize and tag the sentence
    tokens = word_tokenize(sentence)
    tagged = pos_tag(tokens)

    new_tokens = tokens[:]  # Copy original tokens
    modified = False

    # Shuffle indices to ensure random replacement
    indices = list(range(len(tokens)))
    random.shuffle(indices)

    # Try replacing only ONE word
    for i in indices:
        word, tag = tagged[i]
        synonym = get_synonym(word, tag)  # Fetch a synonym
        if synonym != word:  # If a replacement occurred
            new_tokens[i] = synonym
            modified = True
            break  # Stop after replacing one word

    # Reconstruct the sentence
    new_sentence = ' '.join(new_tokens)

    # Return appropriately based on whether modification occurred
    return f"Non-applicable | No synonyms found." if not modified else f"Applicable | {new_sentence}"

# NER (Named Entity Recognition)


def ner(sentence):
    doc = spacy.load("en_core_web_sm")(sentence)
    location_names = ["Canada", "Australia", "Germany",
                      "France", "India", "Japan", "Brazil"]

    transformed_tokens = []
    modified = False  # Track if any location was replaced

    for token in doc:
        if token.ent_type_ == "GPE":  # Check if the token is a location
            new_location = random.choice(location_names)
            transformed_tokens.append(new_location)
            modified = True
        else:
            transformed_tokens.append(token.text)

    transformed_sentence = " ".join(transformed_tokens)
    # Fix spaces before punctuation
    transformed_sentence = re.sub(r'\s+([?.!,"])', r'\1', transformed_sentence)

    if not modified:
        reason = "No location names (GPE entities) found in the sentence."
        return f"Non-applicable | {reason}"

    return f"Applicable | {transformed_sentence}"

# Temporal


def temporal(sentence):
    def get_antonym(word):
        antonyms = set()
        for synset in wn.synsets(word):
            for lemma in synset.lemmas():
                if lemma.antonyms():
                    antonyms.add(lemma.antonyms()[0].name())
        return random.choice(list(antonyms)) if antonyms else None

    def find_subject(sentence):
        doc = spacy.load("en_core_web_sm")(sentence)
        for token in doc:
            if token.dep_ in {"nsubj", "pobj", "dobj"} and token.pos_ in {"NOUN", "PROPN"}:
                return token.text
        return "it"

    sentence = sentence.lower()

    doc = spacy.load("en_core_web_sm")(sentence)
    tense = None
    sentiment_word = None
    for token in doc:
        if token.tag_ in {'VBP', 'VBZ'}:
            tense = 'present'
        if token.pos_ in {"ADJ", "ADV"}:
            sentiment_word = token.text

    if tense != 'present':
        return "Non-applicable | Sentence is not in present tense."

    antonym = get_antonym(sentiment_word) if sentiment_word else None
    subject = find_subject(sentence)
    past_phrase = f"{subject} was not like this"
    transformed_sentence = f"{past_phrase}, but now {sentence}"

    return f"Applicable | {transformed_sentence.capitalize()}"

# Negation


def negation(sentence):
    def antonyms_for(word):
        antonyms = set()
        for ss in wn.synsets(word):
            for lemma in ss.lemmas():
                for antonym in lemma.antonyms():
                    antonyms.add(antonym.name())
        return antonyms

    tokens = word_tokenize(sentence)
    tagged = pos_tag(tokens)

    result = []
    skip_next = False
    negation_found = False
    modified = False

    for i, (word, tag) in enumerate(tagged):
        if skip_next:
            skip_next = False
            continue

        if word.lower() in ["not", "n't"]:
            if i + 1 < len(tagged):
                next_word, next_tag = tagged[i + 1]
                if next_tag.startswith(("JJ", "RB")):
                    antonyms = antonyms_for(next_word)
                    if antonyms:
                        result.append(list(antonyms)[0])
                        modified = True
                    else:
                        result.append(next_word)
                    skip_next = True
            negation_found = True
        else:
            result.append(word)

    if not negation_found:
        for i, (word, tag) in enumerate(tagged):
            if tag.startswith(("JJ", "RB")):
                antonyms = antonyms_for(word)
                if antonyms:
                    result.insert(i, "not")
                    result[i + 1] = list(antonyms)[0]
                    modified = True
                    break

    transformed_text = " ".join(result)
    transformed_text = re.sub(r'\s+([?.!,"])', r'\1', transformed_text)

    if not modified:
        reason = "No antonyms available or no meaningful change occurred."
        return f"Non-applicable | {reason}"

    return f"Applicable | {transformed_text}"

# Coreference


def coreference(sentence):
    try:
        doc = spacy.load("en_core_web_sm")(sentence)

        coref_pronouns = {"he", "she", "it", "his",
                          "her", "they", "them", "i", "its", "we", "us"}
        contains_coref = any(
            token.text.lower() in coref_pronouns for token in doc)

        if not contains_coref:
            return "Non-applicable | No coreferential pronouns found in the text."

        if not doc._.coref_chains:
            return "Non-applicable | No coreference chains detected in the text."

        resolved_text = []
        modified = False

        for token in doc:
            if token.is_punct:
                resolved_text.append(token.text)
            else:
                resolved_token = doc._.coref_chains.resolve(token)
                if resolved_token:
                    resolved_text.append(resolved_token[0].text)
                    modified = True
                else:
                    resolved_text.append(token.text)

        resolved_text = " ".join(resolved_text)
        resolved_text = re.sub(r'\s+([?.!,"])', r'\1', resolved_text)

        return "Non-applicable | No coreference resolution was possible." if not modified else f"Applicable | {resolved_text.strip()}"

    except Exception as e:
        return f"Non-applicable | Error occurred: {str(e)}"

# SRL (Semantic Role Labeling)


def srl(sentence: str) -> str:
    """
    Convert an active voice sentence to passive voice using QuestionConverter.

    Returns:
      - "Non-applicable | Could not convert to passive voice." if conversion is not possible.
      - "Applicable | Modified sentence" if successfully converted.
    """
    converter = QuestionConverter()
    passive_sentence = converter.convert_question(sentence)

    if passive_sentence.lower() == sentence.lower():
        return "Non-applicable | Could not convert to passive voice."

    return f"Applicable | {passive_sentence}"

# Logic


def logic(sentence):
    match = re.search(r'if (.*), then (.*)', sentence, re.IGNORECASE)
    if match:
        condition = match.group(1).strip().rstrip('.')
        conclusion = match.group(2).strip().rstrip('.')
        transformed_sentence = f"If {conclusion}, then {condition}"
        return f"Applicable | {transformed_sentence}"
    return "Non-applicable | No 'if...then...' structure found in the sentence."

# Vocab


def get_random_adjective_or_adverb():
    """
    Selects a random adjective or adverb from WordNet.
    """
    adjectives = set()
    adverbs = set()

    # Collect adjectives
    for synset in wn.all_synsets(pos=wn.ADJ):
        for lemma in synset.lemmas():
            adjectives.add(lemma.name().replace("_", " "))

    # Collect adverbs
    for synset in wn.all_synsets(pos=wn.ADV):
        for lemma in synset.lemmas():
            adverbs.add(lemma.name().replace("_", " "))

    if adjectives and random.choice([True, False]):
        return random.choice(list(adjectives)), 'JJ'  # Adjective
    elif adverbs:
        return random.choice(list(adverbs)), 'RB'  # Adverb
    else:
        return "", ""  # No word found


def vocab(sentence):
    """
    Adds a random adjective before a noun or a random adverb before a verb in the sentence.
    """
    tokens = word_tokenize(sentence)
    tagged = pos_tag(tokens)

    word, pos_tag_value = get_random_adjective_or_adverb()

    if not word:
        return "Non-applicable | No suitable word was found to add."

    modified = False
    new_tokens = []

    # Insert an adjective before the first noun or an adverb before the first verb
    for i, (token, tag) in enumerate(tagged):
        # Insert adjective before noun
        if pos_tag_value == 'JJ' and tag in ['NN', 'NNS', 'NNP', 'NNPS']:
            new_tokens.append(word)
            modified = True
        # Insert adverb before verb
        elif pos_tag_value == 'RB' and tag.startswith('VB'):
            new_tokens.append(word)
            modified = True

        new_tokens.append(token)

    # If no modification was made, return as non-applicable
    if not modified:
        return "Non-applicable | No suitable word placement found."

    transformed_sentence = " ".join(new_tokens)
    return f"Applicable | {transformed_sentence}"


def fairness(sentence):
    """
    Adds gender-specific words ('female' or 'male') to a sentence if no gender word is present.
    If the main noun is not human, adds nationality-specific words ('American', 'Japanese', etc.) instead.

    Returns:
      - "Non-applicable | Sentence already contains a fairness-related word." if gender/nationality words exist.
      - "Applicable | Modified sentence" if a fairness-related word is successfully added.
    """
    # Define gender-specific and nationality-specific words
    gender_words = {"female", "male", "woman", "man",
                    "girl", "boy", "she", "he", "her", "his"}
    nationality_words = ["American", "Japanese", "Korean",
                         "Indian", "Canadian", "Brazilian", "German"]

    # Tokenize and tag parts of speech
    tokens = word_tokenize(sentence)
    tagged = pos_tag(tokens)

    # Check if the sentence already contains a fairness-related word
    if any(word.lower() in gender_words for word in tokens):
        return "Non-applicable | Sentence already contains a fairness-related word."

    # Identify the main noun and check if it is human
    main_noun = None
    for word, tag in tagged:
        if tag in {"NN", "NNS", "NNP", "NNPS"}:  # Nouns
            main_noun = word
            break

    modified = False

    # Check if the main noun is human using WordNet
    if main_noun:
        synsets = wn.synsets(main_noun, pos=wn.NOUN)
        if synsets:
            for synset in synsets:
                if "person" in synset.lexname():
                    # Main noun is human, add a gender word
                    gender_word = random.choice(["female", "male"])
                    tokens.insert(tokens.index(main_noun), gender_word)
                    modified = True
                    break

        # If main noun is not human, add a nationality word
        if not modified:
            nationality_word = random.choice(nationality_words)
            tokens.insert(tokens.index(main_noun), nationality_word)
            modified = True

    # If no main noun is found, prepend a nationality word
    if not modified:
        nationality_word = random.choice(nationality_words)
        sentence = f"{nationality_word} {sentence}"
        modified = True
    else:
        sentence = " ".join(tokens)

    # Ensure no space before punctuation
    sentence = re.sub(r'\s+([?.!,"])', r'\1', sentence)

    return "Non-applicable | No fairness-related word was added." if not modified else f"Applicable | {sentence}"
# Example of a generic apply function for perturbations


def apply_perturbation(perturb_function, sentence):
    result = perturb_function(sentence)
    if "Applicable" in result:
        return "pass"
    return "fail"
# Modify the function to accept a CSV file path and perturbation list
# Function to compute pass/fail results


def check_applicability(csv_file_path, perturbations):
    # Read the CSV file
    df = pd.read_csv(csv_file_path)

    # Calculate total cases: number of rows in the "Question" column * number of perturbations
    total_cases = len(df) * len(perturbations)

    applicable_cases = {perturb: 0 for perturb in perturbations}
    total_applicable_cases = 0
    individual_perturbation_results = {}

    # Loop over each sentence in the 'Question' column
    for index, row in df.iterrows():
        sentence = row['Question']

        # Track the results for each perturbation
        individual_perturbation_results[index] = {"text": sentence}
        for perturb in perturbations:
            result = perturb(sentence)
            individual_perturbation_results[index][perturb.__name__] = result
            if "Applicable" in result:
                applicable_cases[perturb] += 1
                total_applicable_cases += 1

    # Calculate the overall pass percentage
    overall_pass_percentage = 0
    if total_cases > 0:  # Prevent division by zero
        overall_pass_percentage = (total_applicable_cases / total_cases) * 100

    # Prepare the result JSON structure
    result = {
        "overall": {
            "total_cases": total_cases,
            "applicable_cases": total_applicable_cases,
            "pass_percentage": f"{overall_pass_percentage:.2f}%"
        },
        "perturbation_results": {
            perturb.__name__: {
                "total_cases": len(df),
                "applicable_cases": applicable_cases[perturb],
                "pass_percentage": f"{(applicable_cases[perturb] / len(df)) * 100:.2f}%" if len(df) > 0 else "0.00%",
                "applicable": [],
                "non_applicable": []
            }
            for perturb in perturbations
        }
    }

    # Populate individual perturbation results
    for index, row in individual_perturbation_results.items():
        for perturb in perturbations:
            result_text = row[perturb.__name__]
            if "Applicable" in result_text:
                result["perturbation_results"][perturb.__name__]["applicable"].append(
                    result_text)
            else:
                reason = result_text.split(" | ")[1]
                result["perturbation_results"][perturb.__name__]["non_applicable"].append({
                    "text": row["text"],
                    "reason": reason
                })

    return json.dumps(result, indent=4)
