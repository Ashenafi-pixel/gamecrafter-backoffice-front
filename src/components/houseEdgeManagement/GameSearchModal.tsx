import React, { useState, useEffect, useCallback } from "react";
import { Search, X, Check } from "lucide-react";
import { Game } from "../../types/gameManagement";
import { gameManagementService } from "../../services/gameManagementService";

interface GameSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectGame: (game: Game) => void;
  selectedGameId?: string;
  /** When provided, use this list instead of calling the API (demo mode) */
  games?: Game[];
}

const GameSearchModal: React.FC<GameSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectGame,
  selectedGameId,
  games: gamesProp,
}) => {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);

  const PER_PAGE = 10;
  const loadGames = useCallback(
    async (search: string = "", pageNum: number = 1) => {
      if (gamesProp != null) {
        const q = search.toLowerCase().trim();
        let list = gamesProp.filter(
          (g) =>
            !q ||
            g.name.toLowerCase().includes(q) ||
            (g.game_id && g.game_id.toLowerCase().includes(q)) ||
            (g.provider && g.provider.toLowerCase().includes(q)),
        );
        list = list.sort((a, b) => a.name.localeCompare(b.name));
        const total = list.length;
        const totalP = Math.max(1, Math.ceil(total / PER_PAGE));
        const start = (pageNum - 1) * PER_PAGE;
        setGames(list.slice(start, start + PER_PAGE));
        setTotalPages(totalP);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const response = await gameManagementService.getGames({
          search,
          page: pageNum,
          per_page: PER_PAGE,
          enabled: true,
          sort_by: "name",
          sort_order: "asc",
        });
        if (response.success) {
          setGames(response.data.games);
          setTotalPages(response.data.total_pages);
        }
      } catch (error) {
        console.error("Error loading games:", error);
      } finally {
        setLoading(false);
      }
    },
    [gamesProp],
  );

  useEffect(() => {
    if (isOpen) {
      loadGames(searchTerm, 1);
      setPage(1);
    }
  }, [isOpen, loadGames, searchTerm]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadGames(searchTerm, 1);
  };

  const handleSelectGame = (game: Game) => {
    setSelectedGame(game);
    onSelectGame(game);
    onClose();
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    loadGames(searchTerm, newPage);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Select Game</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search games by name, game ID, or provider..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </form>

        {/* Games List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : games.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No games found</div>
          ) : (
            <div className="space-y-2">
              {games.map((game) => (
                <div
                  key={game.id}
                  onClick={() => handleSelectGame(game)}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedGameId === game.id
                      ? "border-blue-500 bg-blue-900/20"
                      : "border-gray-600 hover:border-gray-500 hover:bg-gray-700/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-white font-medium">{game.name}</h3>
                        <span className="text-xs bg-gray-600 text-gray-300 px-2 py-1 rounded">
                          {game.status}
                        </span>
                        {game.enabled && (
                          <span className="text-xs bg-green-600 text-white px-2 py-1 rounded">
                            Enabled
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-sm text-gray-400">
                        <div>Game ID: {game.game_id}</div>
                        <div>Provider: {game.provider}</div>
                        <div>Internal Name: {game.internal_name}</div>
                      </div>
                    </div>
                    {selectedGameId === game.id && (
                      <Check className="h-5 w-5 text-blue-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center space-x-2 mt-4 pt-4 border-t border-gray-600">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
            >
              Previous
            </button>
            <span className="text-gray-300">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages}
              className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameSearchModal;
