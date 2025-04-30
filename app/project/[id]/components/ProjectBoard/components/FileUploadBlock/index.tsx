import React, { useRef, useCallback, useEffect, useState } from 'react';
import { MdDriveFolderUpload, MdFolder } from 'react-icons/md';
import { GrFormClose } from 'react-icons/gr';
import styles from './FileUploadBlock.module.css';

// Define a more specific type for file types
type FileType = 'csv' | 'xlsx';

interface FileUploadProps {
  fileName?: string;
  fileType: FileType;
  onFileSelect: (file: File) => void;
  onFileRemove?: () => void;
  onShowPreprocessPrompt?: () => void;
  isProcessComplete?: boolean;
  onShowDashboard?: () => void;
  hasApplicabilityResults?: boolean;
  projectType?: string;
  contextOption?: string;
  onContextOptionChange?: (option: string) => void;
  projectHasDefaultSystemPrompt?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({
  fileName,
  fileType,
  onFileSelect,
  onFileRemove,
  onShowPreprocessPrompt,
  isProcessComplete,
  onShowDashboard,
  hasApplicabilityResults,
  projectType,
  contextOption = 'withoutContext',
  onContextOptionChange,
  projectHasDefaultSystemPrompt
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [systemPromptType, setSystemPromptType] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch project system prompt type when the component mounts
  useEffect(() => {
    const fetchProjectData = async () => {
      // Extract project ID from the URL
      const projectId = window.location.pathname.split('/').pop();

      if (projectId) {
        try {
          setIsLoading(true);
          const response = await fetch(`/api/projects/${projectId}`);
          if (response.ok) {
            const projectData = await response.json();
            // Get system prompt type
            const promptType = projectData.systemPrompt?.type || 'default';
            console.log('Fetched project system prompt type:', promptType);
            setSystemPromptType(promptType);
          }
        } catch (error) {
          console.error('Error fetching project data:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchProjectData();
  }, []);

  const truncateFileName = useCallback((name: string, maxLength: number = 15): string => {
    if (!name) return '';
    if (name.length <= maxLength) return name;

    const extension = name.split('.').pop() || '';
    const nameWithoutExt = name.slice(0, name.lastIndexOf('.'));
    const truncatedName = nameWithoutExt.slice(0, maxLength - 3) + '...';
    return `${truncatedName}.${extension}`;
  }, []);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // console.log(`[FileUpload] File selected: ${file.name} (${file.size} bytes, type: ${file.type})`);

      onFileSelect(file)

      // Read and log file contents
      const reader = new FileReader();

      reader.onload = (e) => {
        const content = e.target?.result;

        // For CSV files, log the first few lines
        if (fileType === 'csv') {
          const textContent = content as string;
          const lines = textContent.split('\n');
        }
        // For XLSX files, use SheetJS to parse and log content
        else if (fileType === 'xlsx') {
          try {
            // Dynamically import XLSX
            import('xlsx').then(XLSX => {
              try {
                // Read the workbook
                const workbook = XLSX.read(content, {
                  type: 'array',
                  cellStyles: true,
                  cellFormula: true,
                  cellDates: true,
                  cellNF: true,
                  sheetStubs: true
                });

                // Log data from each sheet
                workbook.SheetNames.forEach(sheetName => {
                  const sheet = workbook.Sheets[sheetName];

                  // Get sheet dimensions
                  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
                  // console.log(`[FileUpload] Sheet "${sheetName}" dimensions: ${range.e.r + 1} rows x ${range.e.c + 1} columns`);

                  // Convert to JSON with explicit typing
                  const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

                  // Log header row
                  if (jsonData.length > 0) {
                    // console.log(`[FileUpload] Sheet "${sheetName}" header: ${JSON.stringify(jsonData[0])}`);
                  }

                  // Log first few data rows
                  const dataRowCount = Math.min(jsonData.length - 1, 3);
                  for (let i = 1; i <= dataRowCount; i++) {
                    if (jsonData[i] && Array.isArray(jsonData[i])) {
                      // console.log(`[FileUpload] Sheet "${sheetName}" row ${i}: ${JSON.stringify(jsonData[i])}`);
                    }
                  }

                  // Check for required columns
                  if (jsonData.length > 0) {
                    const headers = jsonData[0].map(h => String(h).toLowerCase());
                    const hasRequiredColumns =
                      headers.some(h => h.includes('question')) &&
                      headers.some(h => h.includes('expected_answer') || h.includes('expected answer'));

                    // console.log(`[FileUpload] Sheet "${sheetName}" has required columns: ${hasRequiredColumns}`);
                  }
                });
              } catch (error) {
                console.error(`[FileUpload] Error parsing XLSX:`, error);
              }
            }).catch(error => {
              console.error(`[FileUpload] Error loading XLSX library:`, error);
            });
          } catch (error) {
            console.error(`[FileUpload] Error in XLSX processing:`, error);
          }
        }
      };

      reader.onerror = (error) => {
        console.error(`[FileUpload] Error reading file: ${error}`);
      };

      // Start reading the file
      if (fileType === 'csv') {
        reader.readAsText(file);
      } else {
        reader.readAsArrayBuffer(file);
      }

      // Clear the input value so that the same file can be uploaded again later.
      if (event.target) {
        event.target.value = '';
      }
    }
  }, [onFileSelect, fileType]);

  const handleDashboardClick = useCallback(() => {
    if (isProcessComplete && onShowDashboard) {
      // console.log("[FileUpload] Show dashboard clicked");
      onShowDashboard();
    }
  }, [isProcessComplete, onShowDashboard]);

  const getButtonConfig = () => {
    if (!fileName) {
      return {
        text: '+ Upload',
        onClick: handleUploadClick,
        disabled: false
      };
    }

    if (isProcessComplete) {
      return {
        text: 'Show Dashboard',
        onClick: handleDashboardClick,
        disabled: false
      };
    }

    return {
      text: 'Process Applicability',
      onClick: onShowPreprocessPrompt,
      disabled: false
    };
  };

  const { text: buttonText, onClick: buttonOnClick, disabled: buttonDisabled } = getButtonConfig();

  // Only show context options if:
  // 1. It's a QA project
  // 2. A file is uploaded
  // 3. The context option change handler exists
  // 4. System prompt type is 'default' (not 'custom')
  const isDefaultPrompt = systemPromptType === 'default' ||
    (projectHasDefaultSystemPrompt === true);

  const showContextOptions =
    projectType === 'qa' &&
    !!fileName &&
    !!onContextOptionChange &&
    isDefaultPrompt;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <MdDriveFolderUpload className={styles.uploadIcon} />
          <span>{fileType === 'csv' ? 'CSV' : 'XLSX'}</span>
        </div>
      </div>

      {fileName && (
        <div className={styles.fileItem}>
          <div className={styles.fileInfo}>
            <MdFolder className={styles.fileIcon} />
            <span
              className={styles.fileName}
              title={fileName}
            >
              {truncateFileName(fileName)}
            </span>
          </div>
          {onFileRemove && (
            <button
              onClick={onFileRemove}
              className={styles.removeButton}
              aria-label="Remove file"
            >
              <GrFormClose />
            </button>
          )}
        </div>
      )}

      {/* Show context options only for QA projects with default system prompt */}
      {showContextOptions &&
        <div className={styles.contextOptions}>
          <div className={styles.optionLabel}>File contains context?</div>
          <div className={styles.optionButtons}>
            <button
              className={`${styles.optionButton} ${contextOption === 'withContext' ? styles.active : ''}`}
              onClick={() => onContextOptionChange('withContext')}
              type="button"
            >
              Yes
            </button>
            <button
              className={`${styles.optionButton} ${contextOption === 'withoutContext' ? styles.active : ''}`}
              onClick={() => onContextOptionChange('withoutContext')}
              type="button"
            >
              No
            </button>
          </div>
        </div>
      }

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
        accept={fileType === 'csv' ? '.csv' : '.xlsx,.xls'}
      />

      <button
        className={`${styles.uploadButton} ${buttonDisabled ? styles.disabled : ''}`}
        onClick={buttonOnClick}
        disabled={buttonDisabled}
      >
        {buttonText}
      </button>
    </div>
  );
};

export default FileUpload;