from setuptools import setup, find_packages
from setuptools.command.install import install
import os

class PostInstallCommand(install):
    """Post-installation to download SpaCy language model."""
    def run(self):
        install.run(self)
        os.system("python -m spacy download en_core_web_sm -q")

setup(
    name='PromptOps',
    version='0.1.0',
    description='A Python library for LLM testing',
    author='ChommakornS',
    author_email='chommakorn.son@gmail.com',
    packages=find_packages(),
    install_requires=[
        'openai==0.28',
        'pandas',
        'sentence-transformers',
        'scikit-learn',
        'langchain',
        'google-generativeai',
        'nltk',
        'PyDictionary',
        'spacy',
        'transformers',
        'torch',
        'llama-stack'
    ],
     cmdclass={
        'install': PostInstallCommand,
    },
)
