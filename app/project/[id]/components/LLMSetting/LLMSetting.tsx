import { useState } from 'react';
import styles from './LLMSetting.module.css';

const LLMSetting = () => {
    const [selectedLLM, setSelectedLLM] = useState('');
    const [systemContent, setSystemContent] = useState('none');
    const [customContent, setCustomContent] = useState('');
    const [apiKey, setApiKey] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Just log the settings for demo
        console.log('Settings:', {
            model: selectedLLM,
            systemContent: systemContent === 'other' ? customContent : systemContent,
            apiKey
        });
    };

    return (
        <div className={styles.wrapper}>
            <div className={styles.container}>
                <form onSubmit={handleSubmit} className={styles.form}>
                    <h1 className={styles.title}>LLM / Model Completion</h1>

                    <div className={styles.field}>
                        <label className={styles.label}>LLM</label>
                        <select
                            value={selectedLLM}
                            onChange={(e) => setSelectedLLM(e.target.value)}
                            className={`${styles.select} ${!selectedLLM && styles.placeholder}`}
                        >
                            <option value="" disabled>Select LLM</option>
                            <optgroup label="Gemini">
                                <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                                <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                                <option value="gemini-1.0-pro">Gemini 1.0 Pro</option>
                            </optgroup>
                            <optgroup label="GPT">
                                <option value="gpt-4-turbo">GPT-4-turbo</option>
                                <option value="gpt-4">GPT-4</option>
                                <option value="gpt-4o">GPT-4o</option>
                                <option value="gpt-3.5-turbo">GPT-3.5-turbo</option>
                            </optgroup>
                            <optgroup label="Claude">
                                <option value="claude">Claude</option>
                            </optgroup>
                            <option value="custom">Custom</option>
                        </select>
                    </div>

                    <div className={styles.field}>
                        <label className={styles.label}>System Content</label>
                        <div className={styles.radioGroup}>
                            <label className={styles.radioLabel}>
                                <input
                                    type="radio"
                                    name="systemContent"
                                    value="qa"
                                    checked={systemContent === 'qa'}
                                    onChange={(e) => setSystemContent(e.target.value)}
                                    className={styles.radioInput}
                                />
                                <span className={styles.radioText}>
                                    You will be acted like a Question Answering system
                                </span>
                            </label>

                            <label className={styles.radioLabel}>
                                <input
                                    type="radio"
                                    name="systemContent"
                                    value="none"
                                    checked={systemContent === 'none'}
                                    onChange={(e) => setSystemContent(e.target.value)}
                                    className={styles.radioInput}
                                />
                                <span className={styles.radioText}>Not selected</span>
                            </label>

                            <label className={styles.radioLabel}>
                                <input
                                    type="radio"
                                    name="systemContent"
                                    value="other"
                                    checked={systemContent === 'other'}
                                    onChange={(e) => setSystemContent(e.target.value)}
                                    className={styles.radioInput}
                                />
                                <span className={styles.radioText}>Other</span>
                                <input
                                    type="text"
                                    value={customContent}
                                    onChange={(e) => setCustomContent(e.target.value)}
                                    placeholder="Your content"
                                    className={`${styles.textInput} ${systemContent !== 'other' && styles.disabled}`}
                                    disabled={systemContent !== 'other'}
                                />
                            </label>
                        </div>
                    </div>

                    <div className={styles.field}>
                        <label className={styles.label}>API Key</label>
                        <input
                            type="text"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="Your API Key"
                            className={styles.textInput}
                        />
                    </div>

                    <button type="submit" className={styles.button}>
                        Apply
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LLMSetting