import { FiSearch } from 'react-icons/fi';
import styles from './SearchBar.module.css';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

const SearchBar = ({ value, onChange }: SearchBarProps) => {
  return (
    <div className={styles.searchContainer}>
      <FiSearch className={styles.searchIcon} />
      <input
        type="text"
        placeholder="Search..."
        className={styles.searchInput}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
};

export default SearchBar;