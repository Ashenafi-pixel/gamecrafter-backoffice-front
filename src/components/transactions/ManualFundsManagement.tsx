import React, { useState, useEffect } from "react";
import {
  Search,
  Filter,
  Download,
  X,
  RefreshCw,
  Upload,
  Info,
  Plus,
  UserPlus,
} from "lucide-react";
import { useServices } from "../../contexts/ServicesContext";
import { wmsService } from "../../services/wmsService";
import { ManualFund, User } from "../../types";
import { FundManagementModal } from "../players/FundManagementModal";
import toast from "react-hot-toast";

const convertToCSV = (manualFunds: ManualFund[]): string => {
  const headers = [
    "Transaction ID",
    "User ID",
    "Admin ID",
    "Type",
    "Currency",
    "Amount (USD)",
    "Created At",
  ];
  const rows = (manualFunds || []).map((mf) => [
    mf.transaction_id,
    mf.user_id,
    mf.admin_id,
    mf.type,
    mf.currency_code,
    (mf.amount_cents / 100).toLocaleString(),
    new Date(mf.created_at).toLocaleString(),
  ]);

  return [
    headers.join(","),
    ...rows.map((row) => row.map((val) => `"${val}"`).join(",")),
  ].join("\n");
};

const downloadCSV = (csv: string, filename: string) => {
  const blob = new Blob([csv], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
};

export const ManualFundManagement: React.FC = () => {
  const { adminSvc } = useServices();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedCurrencies, setSelectedCurrencies] = useState<string[]>([]);
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [showTypeFilter, setShowTypeFilter] = useState(false);
  const [showCurrencyFilter, setShowCurrencyFilter] = useState(false);
  const [showReasonFilter, setShowReasonFilter] = useState(false);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [amountRange, setAmountRange] = useState({ min: "", max: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [manualFunds, setManualFunds] = useState<ManualFund[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalFundsUSD, setTotalFundsUSD] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddFundsModal, setShowAddFundsModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [amountUSD, setAmountUSD] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);
  const [transactionType, setTransactionType] = useState<string>("DEPOSIT");
  const [reason, setReason] = useState<string>("system_restart");
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedFund, setSelectedFund] = useState<ManualFund | null>(null);

  // New modals state
  const [showUserSelectionModal, setShowUserSelectionModal] = useState(false);
  const [showAddManualFundModal, setShowAddManualFundModal] = useState(false);
  const [selectedUserForFund, setSelectedUserForFund] = useState<User | null>(
    null,
  );
  const [usersList, setUsersList] = useState<User[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(1);
  const [usersSearchTerm, setUsersSearchTerm] = useState("");
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersPerPage] = useState(10);

  const [addFundAmount, setAddFundAmount] = useState("");
  const [addFundType, setAddFundType] = useState<string>("DEPOSIT");
  const [addFundCurrency, setAddFundCurrency] = useState<string>("USD");
  const [addFundNote, setAddFundNote] = useState("");
  const [addFundReason, setAddFundReason] = useState<string>("system_restart");
  const [addFundProofFile, setAddFundProofFile] = useState<File | null>(null);
  const [addFundLoading, setAddFundLoading] = useState(false);

  const allTypes = ["DEPOSIT", "WITHDRAWAL", "ADJUSTMENT"];
  const allCurrencies = ["USD", "BTC", "ETH", "USDT", "USDC", "LTC"];
  const allReasons = [
    "system_restart",
    "manual_adjustment",
    "error_correction",
  ];

  const fetchManualFunds = async (silent: boolean = false) => {
    if (!silent) {
      setIsLoading(true);
    }
    setError(null);
    try {
      const params: {
        limit?: number;
        offset?: number;
        user_id?: string;
      } = {
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage,
      };

      const response = await wmsService.getManualFunds(params);

      if (response && response.data) {
        // Convert backend response to frontend format
        let manualFundsList: ManualFund[] = response.data.map((item: any) => ({
          id: item.id,
          user_id: item.user_id,
          username: item.username,
          admin_id: item.admin_id,
          admin_name: item.admin_name,
          transaction_id: item.transaction_id,
          type: item.type as "DEPOSIT" | "WITHDRAWAL" | "ADJUSTMENT",
          amount_cents: item.amount_cents || 0,
          currency_code: item.currency_code,
          note: item.note || "",
          reason: item.reason || "",
          created_at: item.created_at,
        }));

        // Apply client-side filters
        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase();
          manualFundsList = manualFundsList.filter(
            (fund) =>
              fund.transaction_id?.toLowerCase().includes(searchLower) ||
              fund.user_id?.toLowerCase().includes(searchLower) ||
              fund.username?.toLowerCase().includes(searchLower),
          );
        }

        if (selectedTypes.length > 0) {
          manualFundsList = manualFundsList.filter((fund) =>
            selectedTypes.includes(fund.type),
          );
        }

        if (selectedCurrencies.length > 0) {
          manualFundsList = manualFundsList.filter((fund) =>
            selectedCurrencies.includes(fund.currency_code),
          );
        }

        if (selectedReasons.length > 0) {
          manualFundsList = manualFundsList.filter((fund) =>
            selectedReasons.includes(fund.reason),
          );
        }

        if (dateRange.start || dateRange.end) {
          manualFundsList = manualFundsList.filter((fund) => {
            const fundDate = new Date(fund.created_at);
            if (dateRange.start && fundDate < new Date(dateRange.start))
              return false;
            if (dateRange.end && fundDate > new Date(dateRange.end))
              return false;
            return true;
          });
        }

        if (amountRange.min || amountRange.max) {
          manualFundsList = manualFundsList.filter((fund) => {
            const amountUSD = fund.amount_cents / 100;
            if (amountRange.min && amountUSD < parseFloat(amountRange.min))
              return false;
            if (amountRange.max && amountUSD > parseFloat(amountRange.max))
              return false;
            return true;
          });
        }

        setManualFunds(manualFundsList);
        setTotalItems(response.total || 0);
        setTotalPages(Math.ceil((response.total || 0) / itemsPerPage));
        setTotalFundsUSD(response.total_usd_value || 0);
      } else {
        if (!silent) {
          setError("Failed to fetch manual funds");
        }
        setManualFunds([]);
      }
    } catch (err: any) {
      if (!silent) {
        setError(err.message || "Failed to fetch manual funds");
      }
      setManualFunds([]);
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  };

  const fetchUsers = async (search: string = "") => {
    try {
      const response = await adminSvc.get<{
        users: User[];
        total: number;
      }>("/users", {
        params: { search: search.toLowerCase(), limit: "50" },
      });
      if (response.success && response.data) {
        setUsers(response.data.users);
        setFilteredUsers(response.data.users);
      } else {
        setModalError("Failed to fetch users");
      }
    } catch (err: any) {
      setModalError(err.message || "Failed to fetch users");
    }
  };

  const handleExport = () => {
    const csv = convertToCSV(manualFunds);
    downloadCSV(csv, `manual_funds_${new Date().toISOString()}.csv`);
  };

  // Fetch users for user selection modal
  const fetchUsersForModal = async () => {
    setUsersLoading(true);
    try {
      const response = await wmsService.getUsers({
        limit: usersPerPage,
        offset: (usersPage - 1) * usersPerPage,
        search: usersSearchTerm || undefined,
      });
      setUsersList(response.data || []);
      setUsersTotal(response.total || 0);
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch users");
      setUsersList([]);
    } finally {
      setUsersLoading(false);
    }
  };

  // Handle opening user selection modal
  const handleOpenUserSelection = () => {
    setShowUserSelectionModal(true);
    setUsersPage(1);
    setUsersSearchTerm("");
    fetchUsersForModal();
  };

  // Handle opening add manual fund modal
  const handleOpenAddManualFund = (user: User) => {
    setSelectedUserForFund(user);
    setShowAddManualFundModal(true);
    setAddFundAmount("");
    setAddFundType("DEPOSIT");
    setAddFundCurrency("USD");
    setAddFundNote("");
    setAddFundReason("system_restart");
    setAddFundProofFile(null);
  };

  // Handle adding manual fund
  const handleAddManualFund = async () => {
    if (!selectedUserForFund) {
      toast.error("Please select a user");
      return;
    }

    if (
      !addFundAmount ||
      !addFundType ||
      !addFundCurrency ||
      !addFundNote ||
      !addFundReason ||
      !addFundProofFile
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    const amountCents = Math.round(parseFloat(addFundAmount) * 100);
    if (isNaN(amountCents) || amountCents <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setAddFundLoading(true);
    try {
      const formData = new FormData();
      formData.append("amount_cents", amountCents.toString());
      formData.append("type", addFundType);
      formData.append("currency_code", addFundCurrency);
      formData.append("note", addFundNote);
      formData.append("reason", addFundReason);
      formData.append("proof", addFundProofFile);

      const response = await wmsService.addManualFund(
        selectedUserForFund.id,
        formData,
      );

      if (response.success) {
        toast.success("Manual fund added successfully");
        setShowAddManualFundModal(false);
        setShowUserSelectionModal(false);
        setSelectedUserForFund(null);
        // Reset form
        setAddFundAmount("");
        setAddFundType("DEPOSIT");
        setAddFundCurrency("USD");
        setAddFundNote("");
        setAddFundReason("system_restart");
        setAddFundProofFile(null);
        // Refresh manual funds list
        fetchManualFunds(false);
      } else {
        toast.error(response.message || "Failed to add manual fund");
      }
    } catch (err: any) {
      toast.error(
        err.response?.data?.message ||
          err.message ||
          "Failed to add manual fund",
      );
    } finally {
      setAddFundLoading(false);
    }
  };

  // Effect to fetch users when modal opens or search/page changes
  useEffect(() => {
    if (showUserSelectionModal) {
      const timeoutId = setTimeout(
        () => {
          fetchUsersForModal();
        },
        usersSearchTerm ? 500 : 0,
      ); // Debounce search by 500ms

      return () => clearTimeout(timeoutId);
    }
  }, [usersPage, usersSearchTerm, showUserSelectionModal]);

  useEffect(() => {
    fetchManualFunds(false); // Initial load - show loading
    const interval = setInterval(() => fetchManualFunds(true), 30000); // Silent polling
    return () => clearInterval(interval);
  }, [
    currentPage,
    itemsPerPage,
    searchTerm,
    selectedTypes,
    selectedCurrencies,
    selectedReasons,
    dateRange,
    amountRange,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    selectedTypes,
    selectedCurrencies,
    selectedReasons,
    dateRange,
    amountRange,
  ]);

  useEffect(() => {
    if (showAddFundsModal) {
      fetchUsers();
    }
  }, [showAddFundsModal]);

  useEffect(() => {
    if (userSearchTerm) {
      fetchUsers(userSearchTerm);
    } else {
      setFilteredUsers(users);
    }
  }, [userSearchTerm]);

  const toggleTypeSelection = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  const toggleCurrencySelection = (currency: string) => {
    setSelectedCurrencies((prev) =>
      prev.includes(currency)
        ? prev.filter((c) => c !== currency)
        : [...prev, currency],
    );
  };

  const toggleReasonSelection = (reason: string) => {
    setSelectedReasons((prev) =>
      prev.includes(reason)
        ? prev.filter((r) => r !== reason)
        : [...prev, reason],
    );
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    setSelectedTypes([]);
    setSelectedCurrencies([]);
    setSelectedReasons([]);
    setDateRange({ start: "", end: "" });
    setAmountRange({ min: "", max: "" });
    setCurrentPage(1);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "DEPOSIT":
      case "add_fund":
        return "text-green-400 bg-green-400/10";
      case "WITHDRAWAL":
      case "remove_fund":
        return "text-red-400 bg-red-400/10";
      case "ADJUSTMENT":
        return "text-yellow-400 bg-yellow-400/10";
      default:
        return "text-gray-400 bg-gray-400/10";
    }
  };

  const getTypeDisplayName = (type: string) => {
    switch (type) {
      case "add_fund":
        return "Add Fund";
      case "remove_fund":
        return "Remove Fund";
      case "DEPOSIT":
        return "Deposit";
      case "WITHDRAWAL":
        return "Withdrawal";
      case "ADJUSTMENT":
        return "Adjustment";
      default:
        return type;
    }
  };

  // Use backend totalPages if available, otherwise calculate
  const calculatedTotalPages =
    totalPages > 0 ? totalPages : Math.ceil(totalItems / itemsPerPage);

  const SkeletonRow = () => (
    <tr className="border-b border-gray-700/50">
      {Array.from({ length: 8 }).map((_, index) => (
        <td key={index} className="py-3 px-4">
          <div className="h-4 bg-gray-600/50 rounded animate-pulse"></div>
        </td>
      ))}
    </tr>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">
          Manual Fund Management
        </h1>
        <p className="text-gray-400 mt-1">
          Search and manage manual fund transactions
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-400">Total Funds USD</h3>
          <p className="text-2xl font-bold text-white">
            $
            {totalFundsUSD.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-400">
            Total Transactions
          </h3>
          <p className="text-2xl font-bold text-white">{totalItems}</p>
        </div>
      </div>

      <div className="flex items-center justify-end">
        <div className="flex items-center space-x-3">
          {/* <button
            onClick={() => setShowAddFundsModal(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Manage Funds</span>
          </button> */}
          <button
            onClick={clearAllFilters}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
          >
            Clear All
          </button>
          <button
            onClick={() => fetchManualFunds(false)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleExport}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-600/10 border border-red-600 text-red-400 p-4 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search by Transaction ID, Username, or Admin Name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg pl-10 pr-4 py-3"
            />
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) =>
                  setDateRange((prev) => ({ ...prev, start: e.target.value }))
                }
                className="bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm"
              />
              <span className="text-gray-400">to</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) =>
                  setDateRange((prev) => ({ ...prev, end: e.target.value }))
                }
                className="bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="number"
                placeholder="Min USD"
                value={amountRange.min}
                onChange={(e) =>
                  setAmountRange((prev) => ({ ...prev, min: e.target.value }))
                }
                className="bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm w-24"
              />
              <span className="text-gray-400">-</span>
              <input
                type="number"
                placeholder="Max USD"
                value={amountRange.max}
                onChange={(e) =>
                  setAmountRange((prev) => ({ ...prev, max: e.target.value }))
                }
                className="bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm w-24"
              />
            </div>

            <div className="relative">
              <button
                onClick={() => setShowTypeFilter(!showTypeFilter)}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
              >
                <Filter className="h-4 w-4" />
                <span>Type ({selectedTypes.length})</span>
              </button>
              {showTypeFilter && (
                <div className="absolute top-full left-0 mt-2 bg-gray-700 border border-gray-600 rounded-lg p-3 min-w-[200px] z-10">
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {allTypes.map((type) => (
                      <label
                        key={type}
                        className="flex items-center space-x-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedTypes.includes(type)}
                          onChange={() => toggleTypeSelection(type)}
                          className="rounded border-gray-500"
                        />
                        <span className="text-white text-sm">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => setShowCurrencyFilter(!showCurrencyFilter)}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
              >
                <Filter className="h-4 w-4" />
                <span>Currency ({selectedCurrencies.length})</span>
              </button>
              {showCurrencyFilter && (
                <div className="absolute top-full left-0 mt-2 bg-gray-700 border border-gray-600 rounded-lg p-3 min-w-[200px] z-10">
                  <div className="space-y-2">
                    {allCurrencies.map((currency) => (
                      <label
                        key={currency}
                        className="flex items-center space-x-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedCurrencies.includes(currency)}
                          onChange={() => toggleCurrencySelection(currency)}
                          className="rounded border-gray-500"
                        />
                        <span className="text-white text-sm">{currency}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => setShowReasonFilter(!showReasonFilter)}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
              >
                <Filter className="h-4 w-4" />
                <span>Reason ({selectedReasons.length})</span>
              </button>
              {showReasonFilter && (
                <div className="absolute top-full left-0 mt-2 bg-gray-700 border border-gray-600 rounded-lg p-3 min-w-[200px] z-10">
                  <div className="space-y-2">
                    {allReasons.map((reason) => (
                      <label
                        key={reason}
                        className="flex items-center space-x-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedReasons.includes(reason)}
                          onChange={() => toggleReasonSelection(reason)}
                          className="rounded border-gray-500"
                        />
                        <span className="text-white text-sm capitalize">
                          {reason.replace("_", " ")}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {(selectedTypes.length > 0 ||
            selectedCurrencies.length > 0 ||
            selectedReasons.length > 0) && (
            <div className="flex flex-wrap gap-2">
              {selectedTypes.map((type) => (
                <span
                  key={type}
                  className="bg-blue-600 text-white px-2 py-1 rounded text-xs flex items-center space-x-1"
                >
                  <span>{type}</span>
                  <button onClick={() => toggleTypeSelection(type)}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {selectedCurrencies.map((currency) => (
                <span
                  key={currency}
                  className="bg-green-600 text-white px-2 py-1 rounded text-xs flex items-center space-x-1"
                >
                  <span>{currency}</span>
                  <button onClick={() => toggleCurrencySelection(currency)}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {selectedReasons.map((reason) => (
                <span
                  key={reason}
                  className="bg-teal-600 text-white px-2 py-1 rounded text-xs flex items-center space-x-1"
                >
                  <span className="capitalize">{reason.replace("_", " ")}</span>
                  <button onClick={() => toggleReasonSelection(reason)}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">All Manual Funds</h3>
          <div className="flex items-center space-x-4">
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-gray-700 text-white border border-gray-600 rounded px-2 py-1 text-sm"
            >
              <option value={5}>5 per page</option>
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
            <div className="text-sm text-gray-400">
              Showing {(currentPage - 1) * itemsPerPage + 1}-
              {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems}{" "}
              transactions
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 text-gray-400 font-medium">
                  Transaction ID
                </th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">
                  Username
                </th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">
                  Admin Name
                </th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">
                  Type
                </th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">
                  Currency
                </th>
                <th className="text-right py-3 px-4 text-gray-400 font-medium">
                  Amount (USD)
                </th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">
                  Created At
                </th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: itemsPerPage }).map((_, index) => (
                  <SkeletonRow key={index} />
                ))
              ) : (manualFunds || []).length > 0 ? (
                (manualFunds || []).map((mf, index) => (
                  <tr
                    key={index}
                    className="border-b border-gray-700/50 hover:bg-gray-700/30"
                  >
                    <td className="py-3 px-4 text-purple-400 font-mono text-sm">
                      {mf.transaction_id}
                    </td>
                    <td className="py-3 px-4 text-white font-mono text-sm">
                      {mf.username || mf.user_id}
                    </td>
                    <td className="py-3 px-4 text-white font-mono text-sm">
                      {mf.admin_name || mf.admin_id}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${getTypeColor(mf.type)}`}
                      >
                        {getTypeDisplayName(mf.type)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-white font-bold">
                      {mf.currency_code}
                    </td>
                    <td className="py-3 px-4 text-white text-right font-medium">
                      ${(mf.amount_cents / 100).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-gray-400 text-sm">
                      {new Date(mf.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => {
                          setSelectedFund(mf);
                          setShowDetailsModal(true);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex items-center space-x-1"
                      >
                        <Info className="h-4 w-4" />
                        <span>Details</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center">
                      <Search className="h-12 w-12 mb-2 opacity-50" />
                      <p className="text-lg">No manual funds found</p>
                      <p className="text-sm mt-1">
                        {searchTerm ||
                        selectedTypes.length > 0 ||
                        selectedCurrencies.length > 0 ||
                        selectedReasons.length > 0 ||
                        dateRange.start ||
                        dateRange.end ||
                        amountRange.min ||
                        amountRange.max
                          ? "Try adjusting your search or filters"
                          : "No manual fund transactions have been made yet"}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {calculatedTotalPages > 1 && (manualFunds || []).length > 0 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-700">
            <div className="text-sm text-gray-400">
              Page {currentPage} of {calculatedTotalPages}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
              >
                First
              </button>
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
              >
                Previous
              </button>
              {Array.from(
                { length: Math.min(5, calculatedTotalPages) },
                (_, i) => {
                  let pageNum;
                  if (calculatedTotalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= calculatedTotalPages - 2) {
                    pageNum = calculatedTotalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1 rounded ${
                        currentPage === pageNum
                          ? "bg-purple-600 text-white"
                          : "bg-gray-700 text-white hover:bg-gray-600"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                },
              )}
              <button
                onClick={() =>
                  setCurrentPage((prev) =>
                    Math.min(prev + 1, calculatedTotalPages),
                  )
                }
                disabled={currentPage === calculatedTotalPages}
                className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
              >
                Next
              </button>
              <button
                onClick={() => setCurrentPage(calculatedTotalPages)}
                disabled={currentPage === calculatedTotalPages}
                className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
              >
                Last
              </button>
            </div>
          </div>
        )}
      </div>

      {showAddFundsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Manage Funds</h2>
              <button
                onClick={() => {
                  setShowAddFundsModal(false);
                  setSelectedUser(null);
                  setUserSearchTerm("");
                  setAmountUSD("");
                  setProofFile(null);
                  setNote("");
                  setTransactionType("DEPOSIT");
                  setReason("system_restart");
                  setModalError(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {modalError && (
              <div className="bg-red-600/10 border border-red-600 text-red-400 p-4 rounded-lg mb-4">
                {modalError}
              </div>
            )}

            <div className="space-y-4">
              <div className="relative">
                <label className="text-sm text-gray-400">Select User</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search users by username or email..."
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    onFocus={() => fetchUsers(userSearchTerm)}
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg pl-10 pr-4 py-2 mt-1"
                  />
                </div>

                {document.activeElement?.tagName === "INPUT" &&
                  document.activeElement?.getAttribute("type") === "text" && (
                    <div className="absolute z-10 w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredUsers.length > 0 ? (
                        filteredUsers.map((user) => (
                          <div
                            key={user.id}
                            onClick={() => {
                              setSelectedUser(user);
                              setSelectedPlayer(user);
                              setUserSearchTerm(
                                user.username || user.email || user.id,
                              );
                              if (document.activeElement) {
                                (document.activeElement as HTMLElement).blur();
                              }
                            }}
                            className={`p-3 cursor-pointer hover:bg-gray-600 transition-colors ${
                              selectedUser?.id === user.id ? "bg-gray-600" : ""
                            }`}
                          >
                            <p className="text-white text-sm font-medium">
                              {user.username || user.email}
                            </p>
                            <p className="text-gray-400 text-xs">
                              {user.first_name || user.last_name
                                ? `${user.first_name || ""} ${user.last_name || ""}`
                                : "No name provided"}
                            </p>
                            <p className="text-gray-400 text-xs mt-1">
                              ID: {user.id}
                            </p>
                          </div>
                        ))
                      ) : (
                        <div className="p-3 text-gray-400 text-sm">
                          {userSearchTerm
                            ? "No users found"
                            : "Start typing to search users"}
                        </div>
                      )}
                    </div>
                  )}
              </div>

              {selectedUser && (
                <div className="bg-gray-700/50 rounded-lg p-3 border border-gray-600">
                  <p className="text-white text-sm font-medium">
                    Selected: {selectedUser.username || selectedUser.email}
                  </p>
                  <p className="text-gray-400 text-xs">
                    {selectedUser.first_name || selectedUser.last_name
                      ? `${selectedUser.first_name || ""} ${selectedUser.last_name || ""}`
                      : "No name provided"}
                  </p>
                  <button
                    onClick={() => {
                      setSelectedUser(null);
                      setUserSearchTerm("");
                    }}
                    className="text-red-400 text-xs hover:text-red-300 mt-2"
                  >
                    Clear selection
                  </button>
                </div>
              )}

              <div>
                <label className="text-sm text-gray-400">
                  Transaction Type
                </label>
                <select
                  value={transactionType}
                  onChange={(e) => setTransactionType(e.target.value)}
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 mt-1"
                >
                  {allTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-400">Amount (USD)</label>
                <input
                  type="number"
                  placeholder="Enter amount in USD"
                  value={amountUSD}
                  onChange={(e) => setAmountUSD(e.target.value)}
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 mt-1"
                  step="0.01"
                  min="0"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400">
                  Proof File (Receipt/Invoice)
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 mt-1 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-gray-600 file:text-white hover:file:bg-gray-500"
                  />
                </div>
                {proofFile && (
                  <p className="text-green-400 text-xs mt-1">
                    Selected: {proofFile.name}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm text-gray-400">Note</label>
                <textarea
                  placeholder="Enter a note for this transaction"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 mt-1"
                  rows={3}
                />
              </div>

              <div>
                <label className="text-sm text-gray-400">Reason</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 mt-1"
                >
                  {allReasons.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-4 pt-4">
                <button
                  onClick={() => {
                    setShowAddFundsModal(false);
                    setSelectedUser(null);
                    setUserSearchTerm("");
                    setAmountUSD("");
                    setProofFile(null);
                    setNote("");
                    setTransactionType("DEPOSIT");
                    setReason("system_restart");
                    setModalError(null);
                  }}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowAddFundsModal(false);
                    // FundManagementModal will be shown with selectedPlayer
                  }}
                  disabled={!selectedUser}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  <span>Manage Funds</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDetailsModal && selectedFund && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">
                Transaction Details
              </h2>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedFund(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400">Transaction ID</label>
                <p className="text-white font-mono text-sm">
                  {selectedFund.transaction_id}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-400">User ID</label>
                <p className="text-white font-mono text-sm">
                  {selectedFund.user_id}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-400">Admin ID</label>
                <p className="text-white font-mono text-sm">
                  {selectedFund.admin_id}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-400">Type</label>
                <p
                  className={`text-sm ${getTypeColor(selectedFund.type)} px-2 py-1 rounded inline-block`}
                >
                  {selectedFund.type}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-400">Currency</label>
                <p className="text-white font-bold">
                  {selectedFund.currency_code}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-400">Amount (USD)</label>
                <p className="text-white text-sm">
                  ${(selectedFund.amount_cents / 100).toLocaleString()}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-400">Note</label>
                <p className="text-white text-sm">
                  {selectedFund.note || "N/A"}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-400">Reason</label>
                <p className="text-white text-sm capitalize">
                  {selectedFund.reason.replace("_", " ") || "N/A"}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-400">Created At</label>
                <p className="text-white text-sm">
                  {new Date(selectedFund.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex justify-end pt-4">
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedFund(null);
                  }}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedPlayer && (
        <FundManagementModal
          player={{
            id: selectedPlayer.id,
            username: selectedPlayer.username,
            email: selectedPlayer.email || "",
            phoneNumber: "",
            firstName: selectedPlayer.first_name || "",
            lastName: selectedPlayer.last_name || "",
            dateOfBirth: "",
            streetAddress: "",
            country: "",
            state: "",
            city: "",
            postalCode: "",
            kycStatus: "",
            isEmailVerified: false,
            referalCode: "",
            referalType: "",
            referedByCode: "",
            userType: "",
            primaryWalletAddress: "",
            walletVerificationStatus: "",
            status: "",
            isAdmin: false,
            defaultCurrency: "USD",
            profilePicture: "",
            source: "",
            createdBy: "",
            createdAt: "",
            registrationDate: "",
            lastLogin: "",
            verified: false,
            totalDeposits: 0,
            totalWithdrawals: 0,
            currentBalance: 0, // This would need to be fetched from the API
            totalWagered: 0,
            netProfitLoss: 0,
            sessionsCount: 0,
            vipLevel: "",
            riskScore: "",
            transactions: [],
          }}
          onClose={() => {
            setSelectedPlayer(null);
            setShowAddFundsModal(false);
          }}
          onFundManagement={() => {
            // Refresh the manual funds list after fund management
            fetchManualFunds();
            toast.success(
              `Funds managed successfully for ${selectedPlayer.username}`,
            );
          }}
        />
      )}

      {/* User Selection Modal */}
      {showUserSelectionModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700/50 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
                    <UserPlus className="h-6 w-6" />
                    <span>Select User</span>
                  </h2>
                  <p className="text-gray-400 mt-1">
                    Choose a user to add manual fund
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowUserSelectionModal(false);
                    setUsersSearchTerm("");
                    setUsersPage(1);
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="mt-4 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search users by username or email..."
                  value={usersSearchTerm}
                  onChange={(e) => {
                    setUsersSearchTerm(e.target.value);
                    setUsersPage(1);
                  }}
                  className="w-full bg-gray-700/50 text-white border border-gray-600 rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Users List */}
            <div className="flex-1 overflow-y-auto p-6">
              {usersLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
                </div>
              ) : usersList.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400">No users found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {usersList.map((user) => (
                    <div
                      key={user.id}
                      className="bg-gray-700/50 border border-gray-600 rounded-lg p-4 hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="text-white font-semibold">
                            {user.username || user.email || "N/A"}
                          </h3>
                          <p className="text-gray-400 text-sm mt-1">
                            {user.email && user.email !== user.username
                              ? user.email
                              : ""}
                          </p>
                          <p className="text-gray-500 text-xs mt-1">
                            ID: {user.id}
                          </p>
                        </div>
                        <button
                          onClick={() => handleOpenAddManualFund(user)}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                          <span>Add Manual Fund</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pagination */}
            {usersTotal > 0 && (
              <div className="p-6 border-t border-gray-700 flex items-center justify-between">
                <div className="text-gray-400 text-sm">
                  Showing {(usersPage - 1) * usersPerPage + 1} to{" "}
                  {Math.min(usersPage * usersPerPage, usersTotal)} of{" "}
                  {usersTotal} users
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() =>
                      setUsersPage((prev) => Math.max(1, prev - 1))
                    }
                    disabled={usersPage === 1 || usersLoading}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                  >
                    Previous
                  </button>
                  <span className="text-gray-400 px-4">
                    Page {usersPage} of {Math.ceil(usersTotal / usersPerPage)}
                  </span>
                  <button
                    onClick={() => setUsersPage((prev) => prev + 1)}
                    disabled={
                      usersPage >= Math.ceil(usersTotal / usersPerPage) ||
                      usersLoading
                    }
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Manual Fund Modal */}
      {showAddManualFundModal && selectedUserForFund && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700/50 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
                    <Plus className="h-6 w-6" />
                    <span>Add Manual Fund</span>
                  </h2>
                  <p className="text-gray-400 mt-1">
                    User:{" "}
                    {selectedUserForFund.username || selectedUserForFund.email}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowAddManualFundModal(false);
                    setSelectedUserForFund(null);
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Amount <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={addFundAmount}
                  onChange={(e) => setAddFundAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-gray-700/50 text-white border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Type <span className="text-red-400">*</span>
                </label>
                <select
                  value={addFundType}
                  onChange={(e) => setAddFundType(e.target.value)}
                  className="w-full bg-gray-700/50 text-white border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  {allTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {/* Currency */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Currency <span className="text-red-400">*</span>
                </label>
                <select
                  value={addFundCurrency}
                  onChange={(e) => setAddFundCurrency(e.target.value)}
                  className="w-full bg-gray-700/50 text-white border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  {allCurrencies.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
              </div>

              {/* Note */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Note <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={addFundNote}
                  onChange={(e) => setAddFundNote(e.target.value)}
                  placeholder="Enter a note for this transaction..."
                  rows={3}
                  className="w-full bg-gray-700/50 text-white border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Reason <span className="text-red-400">*</span>
                </label>
                <select
                  value={addFundReason}
                  onChange={(e) => setAddFundReason(e.target.value)}
                  className="w-full bg-gray-700/50 text-white border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  {allReasons.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason
                        .replace("_", " ")
                        .replace(/\b\w/g, (l) => l.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>

              {/* Proof File */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Proof File (PDF, JPEG, JPG, PNG){" "}
                  <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) =>
                      setAddFundProofFile(e.target.files?.[0] || null)
                    }
                    className="w-full bg-gray-700/50 text-white border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-gray-600 file:text-white hover:file:bg-gray-500"
                  />
                </div>
                {addFundProofFile && (
                  <p className="text-green-400 text-sm mt-2">
                    Selected: {addFundProofFile.name}
                  </p>
                )}
                <p className="text-gray-500 text-xs mt-2">
                  Maximum file size: 10MB
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
                <button
                  onClick={() => {
                    setShowAddManualFundModal(false);
                    setSelectedUserForFund(null);
                  }}
                  disabled={addFundLoading}
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddManualFund}
                  disabled={
                    addFundLoading ||
                    !addFundAmount ||
                    !addFundType ||
                    !addFundCurrency ||
                    !addFundNote ||
                    !addFundReason ||
                    !addFundProofFile
                  }
                  className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg flex items-center space-x-2 transition-all shadow-lg shadow-green-600/20"
                >
                  {addFundLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                      <span>Adding...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      <span>Add Manual Fund</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
