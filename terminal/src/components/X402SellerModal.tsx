"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Loader2,
  XCircle,
  AlertCircle,
  Wrench,
  ChevronDown,
  Search,
} from "lucide-react";
import type { X402SellerInfo, ListSellersResponse } from "@/types/x402";

interface X402SellerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSeller: (seller: X402SellerInfo) => void;
}

const X402_PAGE_SIZE = 100;

export default function X402SellerModal({
  isOpen,
  onClose,
  onSelectSeller,
}: X402SellerModalProps) {
  // State
  const [sellers, setSellers] = useState<X402SellerInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalSellers, setTotalSellers] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch sellers when modal opens or page changes
  useEffect(() => {
    if (isOpen) {
      fetchSellers(currentPage);
    }
  }, [isOpen, currentPage]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      setCurrentPage(1);
    }
  }, [isOpen]);

  const fetchSellers = async (page: number, forceRefresh = false) => {
    if (!forceRefresh && sellers.length > 0 && page === currentPage) return;

    setIsLoading(true);
    try {
      const offset = (page - 1) * X402_PAGE_SIZE;
      const response = await fetch("/api/x402-seller", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "list",
          type: "http",
          limit: X402_PAGE_SIZE,
          offset,
        }),
      });

      const data: ListSellersResponse = await response.json();

      if (data.success && data.sellers) {
        setSellers(data.sellers);
        setCurrentPage(page);

        // Estimate total based on whether we got a full page
        if (data.sellers.length === X402_PAGE_SIZE) {
          setTotalSellers(Math.max(totalSellers, offset + X402_PAGE_SIZE + 1));
        } else {
          setTotalSellers(offset + data.sellers.length);
        }
      } else {
        console.error("Failed to fetch PayAI sellers:", data.error);
      }
    } catch (error) {
      console.error("Error fetching PayAI sellers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter sellers based on search query (client-side)
  const filteredSellers = useMemo(() => {
    if (!searchQuery.trim()) return sellers;

    const query = searchQuery.toLowerCase().trim();
    return sellers.filter((seller) => {
      const nameMatch = seller.name.toLowerCase().includes(query);
      const descMatch = seller.description?.toLowerCase().includes(query);
      const urlMatch = seller.resourceUrl.toLowerCase().includes(query);
      const inputMatch = seller.inputDescription?.toLowerCase().includes(query);
      return nameMatch || descMatch || urlMatch || inputMatch;
    });
  }, [sellers, searchQuery]);

  // Pagination calculations
  const hasNextPage = sellers.length === X402_PAGE_SIZE;
  const hasPrevPage = currentPage > 1;

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1) {
      fetchSellers(newPage, true);
    }
  };

  const handleSelectSeller = (seller: X402SellerInfo) => {
    // Only call onSelectSeller - the parent handles closing the modal
    onSelectSeller(seller);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl mx-4 bg-card border border-cyan-500/50 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-500/30 bg-cyan-500/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/20 border border-cyan-500/30">
              <Wrench className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="font-display text-lg text-cyan-300">
                PayAI Sellers
              </h3>
              <p className="text-xs text-cyan-400/60">
                Select a seller to use as your agent&apos;s tool
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-6 py-3 border-b border-border bg-secondary/10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sellers by name, description, or URL..."
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-secondary/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
              >
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>
          {searchQuery && (
            <p className="mt-2 text-xs text-muted-foreground">
              Found {filteredSellers.length} seller
              {filteredSellers.length !== 1 ? "s" : ""} matching &quot;
              {searchQuery}&quot;
              {filteredSellers.length === 0 && sellers.length > 0 && (
                <span className="text-amber-400/80">
                  {" "}
                  — try a different search or browse other pages
                </span>
              )}
            </p>
          )}
        </div>

        {/* Content */}
        <div className="max-h-[50vh] overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
              <span className="ml-3 text-muted-foreground">
                Loading sellers from bazaar...
              </span>
            </div>
          ) : filteredSellers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
              {searchQuery ? (
                <>
                  <p className="text-muted-foreground">
                    No sellers match your search.
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-2">
                    Try a different search term or browse other pages.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-muted-foreground">
                    No PayAI sellers found in the bazaar.
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-2">
                    Try again later or check your network connection.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredSellers.map((seller) => (
                <button
                  key={seller.id}
                  onClick={() => handleSelectSeller(seller)}
                  className="w-full p-4 rounded-lg border border-border bg-secondary/30 hover:border-cyan-500/50 hover:bg-cyan-500/10 transition-all text-left group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-display text-sm text-foreground group-hover:text-cyan-300 transition-colors truncate">
                          {seller.name}
                        </h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          {seller.priceUsdc}
                        </span>
                      </div>
                      {seller.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                          {seller.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {seller.networks.slice(0, 3).map((network) => (
                          <span
                            key={network}
                            className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-secondary text-muted-foreground"
                          >
                            {network.startsWith("solana:")
                              ? "Solana"
                              : network.startsWith("eip155:")
                                ? "EVM"
                                : network}
                          </span>
                        ))}
                        {seller.networks.length > 3 && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-secondary text-muted-foreground">
                            +{seller.networks.length - 3} more
                          </span>
                        )}
                      </div>
                      {seller.inputDescription && (
                        <p className="text-[10px] text-cyan-400/60 mt-2 font-mono">
                          Input: {seller.inputDescription}
                        </p>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-cyan-400 -rotate-90 transition-colors" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {!isLoading && sellers.length > 0 && (
          <div className="px-6 py-3 border-t border-border bg-secondary/10">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Page {currentPage}
                {searchQuery
                  ? ` • Showing ${filteredSellers.length} of ${sellers.length} on this page`
                  : ` • ${sellers.length} sellers`}
              </span>

              <div className="flex items-center gap-2">
                {/* First Page */}
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={!hasPrevPage || isLoading}
                  className="px-2 py-1 rounded text-xs font-mono border border-border bg-secondary/50 text-muted-foreground hover:text-foreground hover:border-cyan-500/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  title="Go to first page"
                >
                  ««
                </button>

                {/* Prev Page */}
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={!hasPrevPage || isLoading}
                  className="px-2 py-1 rounded text-xs font-mono border border-border bg-secondary/50 text-muted-foreground hover:text-foreground hover:border-cyan-500/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  «
                </button>

                {/* Page Numbers */}
                <div className="flex items-center gap-1">
                  {[
                    currentPage - 2,
                    currentPage - 1,
                    currentPage,
                    currentPage + 1,
                    currentPage + 2,
                  ]
                    .filter((p) => p >= 1)
                    .slice(0, 5)
                    .map((pageNum) => (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        disabled={
                          isLoading || (pageNum > currentPage && !hasNextPage)
                        }
                        className={`w-8 h-8 rounded text-xs font-mono border transition-all ${
                          pageNum === currentPage
                            ? "border-cyan-500 bg-cyan-500/20 text-cyan-300"
                            : "border-border bg-secondary/50 text-muted-foreground hover:text-foreground hover:border-cyan-500/50"
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {pageNum}
                      </button>
                    ))}
                </div>

                {/* Next Page */}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={!hasNextPage || isLoading}
                  className="px-2 py-1 rounded text-xs font-mono border border-border bg-secondary/50 text-muted-foreground hover:text-foreground hover:border-cyan-500/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  »
                </button>

                {/* Jump +5 Pages */}
                <button
                  onClick={() => handlePageChange(currentPage + 5)}
                  disabled={!hasNextPage || isLoading}
                  className="px-2 py-1 rounded text-xs font-mono border border-border bg-secondary/50 text-muted-foreground hover:text-foreground hover:border-cyan-500/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  title="Jump 5 pages forward"
                >
                  »»
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border bg-secondary/20">
          <p className="text-[10px] text-muted-foreground text-center">
            PayAI sellers are paid services. Your command will be sent as the
            query input. Search filters results on the current page only.
          </p>
          <p className="text-[10px] text-amber-400/70 text-center mt-1">
            ⚠️ Sellers are not vetted. Research before sending funds.
          </p>
        </div>
      </div>
    </div>
  );
}

