# test_perturb.py

import os
from perturb import Perturbation
from dotenv import load_dotenv

# Test data
questions = [
    "Did Solomon make up bigger percentage of Islamic prophets than Kings of Judah?",
    "Would East India Company prefer China's modern trade?",
    "Will a celibate cleric likely suffer a stoning in Somalia?",
    "Could one Amazon share ever buy twenty year Netflix subscription?",
    "Would an adherent of Zoroastrianism consult the Quran for religious guidance?",
    "Would many meals heavy in brussels sprouts benefit someone on Coumadin?",
    "Would the fastest tortoise win a race against a Chicago \"L\"?",
    "Does Orange County, California require airplanes to be quiet?",
    "Is Nine Inch Nails a good guest for students in earliest grade to take Iowa tests?",
    "Can an anchovy born in 2020 survive 25th US census?",
    "Does USA fail separation of church and state in multiple ways?"
]

statements = [
    "The traffic is heavy",
    "The view from here is unremarkable",
    "I have no strong opinion on this",
    "The car is expensive",
    "The scenery here is unimpressive",
    "This company is awful",
    "I'm very unhappy with this product",
    "The weather is awful today",
    "I'm not interested in this topic",
    "This is a useless product",
    "The traffic is unbearable",
    "The view from here is unappealing",
    "The car is old and unreliable"
]

def test_function(func_name, test_data, perturb_instance):
    """Test a specific perturbation function"""
    print(f"\n{'='*60}")
    print(f"TESTING {func_name.upper()}")
    print('='*60)
    
    for i, text in enumerate(test_data[:3]):  # Test first 3 items
        try:
            print(f"\n{i+1}. Original: {text}")
            
            # Get the function from the instance
            func = getattr(perturb_instance, func_name)
            result = func(text)
            
            print(f"   {func_name.capitalize()}: {result}")
            
        except Exception as e:
            print(f"   ERROR: {e}")
    
    print(f"\n{func_name.upper()} test completed.\n")

def main():
    """Main test function"""
    load_dotenv()
    
    # หา API key
    api_key = os.getenv("OPENAI_API_KEY") or os.getenv("API_KEY_PERURBATION_KEY")
    
    if not api_key:
        print("ERROR: API key not found!")
        print("Current environment variables:")
        print(f"OPENAI_API_KEY: {os.getenv('OPENAI_API_KEY')}")
        print(f"API_KEY_PERURBATION_KEY: {os.getenv('API_KEY_PERURBATION_KEY')}")
        return
    
    print(f"✓ Found API key: {api_key[:10]}...")
    
    try:
        # Initialize the Perturbation class
        print("Initializing Perturbation class...")
        perturb = Perturbation()
        print("✓ Perturbation class initialized successfully!")
        
        # Test each function
        functions_to_test = [
            'taxonomy',
            'negation', 
            'coreference',
            'srl',
            'fairness',
            'temporal',
            'ner',
            'vocab'
        ]
        
        # Test with questions (first few functions work better with questions)
        question_functions = ['taxonomy', 'negation', 'coreference', 'srl']
        
        for func_name in functions_to_test:
            if func_name in question_functions:
                test_function(func_name, questions, perturb)
            else:
                test_function(func_name, statements, perturb)
        
        print("="*60)
        print("ALL TESTS COMPLETED!")
        print("="*60)
        
    except Exception as e:
        print(f"ERROR initializing Perturbation class: {e}")
        print("Check your API key and internet connection.")

if __name__ == "__main__":
    main()