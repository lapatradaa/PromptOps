import { useState, useCallback, useEffect } from 'react';
import { TopicType, Block } from '@/app/types';
import Papa from 'papaparse';
import toast from 'react-hot-toast';
import { TOPIC_MAPPING } from '../constants/topicMapping';

export function useApplicability(
    projectType: string,
    onApplicabilityResults?: (results: any) => void,
    updateBlock?: (id: string, block: Block) => void,
    showDashboard?: (mode: 'applicability' | 'results') => void
) {
    const [perturbations, setPerturbations] = useState<TopicType[]>([]);
    const [results, setResults] = useState<any>(null);
    const [showModal, setShowModal] = useState(false);
    const [uploadedBlock, setUploadedBlock] = useState<Block | null>(null);

    // Update perturbations when project type changes
    useEffect(() => {
        const topics = TOPIC_MAPPING[projectType] || TOPIC_MAPPING.default;
        // console.log('[ProjectBoard] Setting perturbations:', {
        //     projectType, topics, count: topics.length
        // });
        setPerturbations(topics);
    }, [projectType]);

    // Show preprocessing prompt
    const showPreprocessPrompt = useCallback((block?: Block) => {
        setShowModal(true);
        if (block) setUploadedBlock(block);
    }, []);

    // Process data and call API
    const processData = useCallback(async () => {
        setShowModal(false);

        if (!uploadedBlock?.config?.data || !uploadedBlock?.config?.fileName) {
            console.warn('[ProjectBoard] No CSV data found');
            setUploadedBlock(null);
            return;
        }

        try {
            // 1. Parse CSV
            const parseResult = Papa.parse(uploadedBlock.config.data, {
                header: true, skipEmptyLines: true
            });

            if (parseResult.errors.length > 0) {
                console.error('[ProjectBoard] Parse errors:', parseResult.errors);
                toast.error('Error parsing CSV file');
                return;
            }

            // 2. Extract questions
            const rows = parseResult.data as any[];
            const questions = rows
                .map((row) => row.Question?.toString() || '')
                .filter(Boolean);

            if (!questions.length) {
                toast.error('No valid questions found');
                return;
            }

            // 3. Call API
            toast.loading('Processing applicability...', { id: 'processing' });
            const { fileName, data: csvContent } = uploadedBlock.config || {};

            // Use topics from mapping as fallback
            const topicsToUse = perturbations.length > 0
                ? perturbations
                : (TOPIC_MAPPING[projectType] || TOPIC_MAPPING.default);

            const response = await fetch('/api/projects/check-applicability', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileName, csvContent, questions,
                    perturbations: topicsToUse, projectType
                })
            });

            if (!response.ok) {
                handleApiError(response);
                return;
            }

            // Process results
            const result = await response.json();
            toast.dismiss('processing');

            setResults(result);

            // Mark block as processed
            if (updateBlock) {
                updateBlock(uploadedBlock.id, {
                    ...uploadedBlock,
                    config: { ...uploadedBlock.config, processed: true }
                });
            }

            // Notify success
            toast.success("Preprocessing complete!");

            // Show dashboard and notify parent
            if (onApplicabilityResults) onApplicabilityResults(result);
            if (showDashboard) showDashboard('applicability');

            setUploadedBlock(null);
        } catch (err) {
            console.error('[ProjectBoard] Error:', err);
            toast.dismiss('processing');
            toast.error('Failed to preprocess');
        }
    }, [uploadedBlock, perturbations, projectType, updateBlock, onApplicabilityResults, showDashboard]);

    // Handle API errors
    const handleApiError = async (response: Response) => {
        let message = `API error: ${response.status}`;
        try {
            const text = await response.text();
            const parsed = tryParseJson(text);
            message = `API error: ${parsed?.details || parsed?.detail || parsed?.message || text}`;
        } catch (e) { }

        toast.dismiss('processing');
        toast.error(message);
    };

    // Try to parse JSON with nested error details
    const tryParseJson = (text: string) => {
        try {
            const obj = JSON.parse(text);
            if (obj.details) {
                try {
                    return JSON.parse(obj.details);
                } catch (e) { }
            }
            return obj;
        } catch (e) {
            return null;
        }
    };

    // Cancel preprocessing
    const cancelPreprocess = useCallback(() => {
        setShowModal(false);
        setUploadedBlock(null);
    }, []);

    // Show dashboard
    const showApplicabilityDashboard = useCallback(() => {
        if (results && showDashboard) {
            showDashboard('applicability');
        }
    }, [results, showDashboard]);

    return {
        perturbations,
        hasResults: !!results,
        showModal,
        uploadedBlock,
        showPreprocessPrompt,
        processData,
        cancelPreprocess,
        showApplicabilityDashboard
    };
}