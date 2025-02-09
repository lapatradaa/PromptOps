import React, { useRef } from 'react';
import { MdDriveFolderUpload, MdFolder } from 'react-icons/md';
import styles from './FileUploadBlock.module.css';
import { GrFormClose } from 'react-icons/gr';

interface FileUploadProps {
  fileName?: string;
  fileType: 'csv' | 'xlsx';
  onFileSelect: (file: File) => void;
  onFileRemove?: () => void;
}

const FileUpload: React.FC<FileUploadProps> = ({
  fileName,
  fileType,
  onFileSelect,
  onFileRemove
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const truncateFileName = (name: string, maxLength: number = 15) => {
    if (!name) return '';
    if (name.length <= maxLength) return name;

    const extension = name.split('.').pop() || '';
    const nameWithoutExt = name.slice(0, name.lastIndexOf('.'));

    const truncatedName = nameWithoutExt.slice(0, maxLength - 3) + '...';
    return `${truncatedName}.${extension}`;
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

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
            <span className={styles.fileName} title={fileName}>
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

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
        accept={fileType === 'csv' ? '.csv' : '.xlsx,.xls'}
      />

      <button
        className={styles.uploadButton}
        onClick={handleUploadClick}
      >
        + Upload
      </button>
    </div>
  );
};

export default FileUpload;