import React, { useState, useEffect, useCallback } from "react";
import { Search, X, Check, Plus } from "lucide-react";
import { Game } from "../../types/gameManagement";
import { gameManagementService } from "../../services/gameManagementService";

interface BulkGameSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectGames: (games: Game[]) => void;
  selectedGameIds: string[];
  /** When provided, use this list instead of calling the API (demo mode) */
  games?: Game[];
}

const PER_PAGE = 10;

const BulkGameSearchModal: React.FC<BulkGameSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectGames,
  selectedGameIds,
  games: gamesProp,
}) => {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedGames, setSelectedGames] = useState<Set<string>>(
    new Set(selectedGameIds),
  );

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
      setSelectedGames(new Set(selectedGameIds));
    }
  }, [isOpen, loadGames, selectedGameIds]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadGames(searchTerm, 1);
  };

  const toggleGameSelection = (gameId: string) => {
    setSelectedGames((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(gameId)) {
        newSet.delete(gameId);
      } else {
        newSet.add(gameId);
      }
      return newSet;
    });
  };

  const handleConfirm = () => {
    const selectedGamesArray = games.filter((game) =>
      selectedGames.has(game.id),
    );
    onSelectGames(selectedGamesArray);
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
          <h2 className="text-xl font-bold text-white">
            Select Games ({selectedGames.size} selected)
          </h2>
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
              className="w-full pl-10 pr-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </form>

        {/* Games List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            </div>
          ) : games.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No games found</div>
          ) : (
            <div className="space-y-2">
              {games.map((game) => (
                <div
                  key={game.id}
                  onClick={() => toggleGameSelection(game.id)}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedGames.has(game.id)
                      ? "border-purple-500 bg-purple-900/20"
                      : "border-gray-600 hover:border-gray-500 hover:bg-gray-700/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-5 h-5 border-2 rounded flex items-center justify-center ${
                          selectedGames.has(game.id)
                            ? "border-purple-500 bg-purple-500"
                            : "border-gray-500"
                        }`}
                      >
                        {selectedGames.has(game.id) && (
                          <Check className="h-3 w-3 text-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h3 className="text-white font-medium">
                            {game.name}
                          </h3>
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
                    </div>
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

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 mt-4 pt-4 border-t border-gray-600">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={selectedGames.size === 0}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>
              Add {selectedGames.size} Game{selectedGames.size !== 1 ? "s" : ""}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkGameSearchModal;
