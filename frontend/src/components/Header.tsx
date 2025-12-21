import AppHeader from './AppHeader';
import SearchBar from './SearchBar';

interface HeaderProps {
  onPostDealClick?: () => void;
}

export default function Header({
  onPostDealClick,
}: HeaderProps) {
  return (
    <AppHeader
      searchComponent={<SearchBar />}
      onShareDealClick={onPostDealClick}
    />
  );
}
