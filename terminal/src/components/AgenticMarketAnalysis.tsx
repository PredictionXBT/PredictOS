"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { 
  Link2, 
  Plus, 
  Play, 
  ChevronDown, 
  Bot, 
  Loader2, 
  CheckCircle2, 
  XCircle,
  Trash2,
  Layers,
  Sparkles,
  FileText,
  Wrench,
  Eye,
  Zap,
  ExternalLink,
  ArrowDown,
  Cpu,
  CircleDot,
  Coins,
  DollarSign,
  AlertCircle,
} from "lucide-react";
import Image from "next/image";
import type { 
  AgentConfig, 
  AggregatorConfig, 
  GetEventsResponse, 
  EventAnalysisAgentResponse,
  AnalysisAggregatorResponse,
  PmType,
  MarketAnalysis,
  GrokTool,
  AgentTool,
  PolyfactualResearchResult,
} from "@/types/agentic";
import type { PolyfactualResearchResponse } from "@/types/polyfactual";
import AnalysisOutput from "./AnalysisOutput";
import AggregatedAnalysisOutput from "./AggregatedAnalysisOutput";

// Model types
type AIModel = string;

interface ModelOption {
  value: AIModel;
  label: string;
  provider: "grok" | "openai";
}

const GROK_MODELS: ModelOption[] = [
  { value: "grok-4-1-fast-reasoning", label: "Grok 4.1 Fast (Reasoning)", provider: "grok" },
  { value: "grok-4-1-fast-non-reasoning", label: "Grok 4.1 Fast (Non-Reasoning)", provider: "grok" },
  { value: "grok-4-fast-reasoning", label: "Grok 4 Fast (Reasoning)", provider: "grok" },
  { value: "grok-4-fast-non-reasoning", label: "Grok 4 Fast (Non-Reasoning)", provider: "grok" },
];

const OPENAI_MODELS: ModelOption[] = [
  { value: "gpt-5.2", label: "GPT-5.2", provider: "openai" },
  { value: "gpt-5.1", label: "GPT-5.1", provider: "openai" },
  { value: "gpt-5-nano", label: "GPT-5 Nano", provider: "openai" },
  { value: "gpt-4.1", label: "GPT-4.1", provider: "openai" },
  { value: "gpt-4.1-mini", label: "GPT-4.1 Mini", provider: "openai" },
];

const ALL_MODELS: ModelOption[] = [...GROK_MODELS, ...OPENAI_MODELS];

// Tool options
interface ToolOption {
  value: AgentTool;
  label: string;
  grokOnly?: boolean;
}

const TOOL_OPTIONS: ToolOption[] = [
  { value: "x_search", label: "X Search", grokOnly: true },
  { value: "web_search", label: "Web Search", grokOnly: true },
  { value: "polyfactual", label: "PolyFactual Research", grokOnly: false },
];

/**
 * Check if a model is an OpenAI model
 */
function isOpenAIModel(model: string): boolean {
  return OPENAI_MODELS.some(m => m.value === model) || model.startsWith("gpt-");
}

// URL type detection
type UrlType = 'kalshi' | 'polymarket' | 'none';

function detectUrlType(url: string): UrlType {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('kalshi')) return 'kalshi';
  if (lowerUrl.includes('polymarket')) return 'polymarket';
  return 'none';
}

function generateAgentId(): string {
  return `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Analysis mode type
type AnalysisMode = 'supervised' | 'autonomous';

const AgenticMarketAnalysis = () => {
  // URL state
  const [url, setUrl] = useState("");
  
  // Analysis mode state (supervised = shows OkBet link, autonomous = no OkBet link)
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('supervised');
  
  // Event data state
  const [eventData, setEventData] = useState<{
    eventIdentifier: string;
    eventId?: string;
    pmType: PmType;
    markets: unknown[];
  } | null>(null);
  
  // Agent configurations
  const [agents, setAgents] = useState<AgentConfig[]>([
    { id: generateAgentId(), model: "", tools: undefined, userCommand: "", status: 'idle' }
  ]);
  
  // Aggregator configuration
  const [aggregator, setAggregator] = useState<AggregatorConfig>({
    model: "",
    status: 'idle'
  });
  
  // UI state
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set());
  const [expandedAggregator, setExpandedAggregator] = useState(false);
  
  // Autonomous mode state
  const [autonomousBudget, setAutonomousBudget] = useState<number>(10);
  const [autonomousOrderStatus, setAutonomousOrderStatus] = useState<'idle' | 'placing' | 'success' | 'error' | 'skipped'>('idle');
  const [autonomousOrderResult, setAutonomousOrderResult] = useState<{
    orderId?: string;
    side?: string;
    size?: number;
    price?: number;
    costUsd?: number;
    errorMsg?: string;
  } | null>(null);
  
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  
  // Derived state
  const detectedUrlType = useMemo(() => detectUrlType(url), [url]);
  const showAggregator = agents.length > 1;
  const isAutonomousAvailable = detectedUrlType === 'polymarket'; // Only Polymarket supports autonomous mode
  
  // Check if analysis is complete (at least one agent completed, or aggregator completed if multiple agents)
  const isAnalysisComplete = useMemo(() => {
    if (agents.length === 1) {
      return agents[0].status === 'completed';
    }
    return aggregator.status === 'completed' || agents.some(a => a.status === 'completed');
  }, [agents, aggregator.status]);
  
  // Generate OkBet link based on platform type
  const getOkBetLink = useMemo(() => {
    if (!eventData) return null;
    
    if (eventData.pmType === 'Polymarket') {
      // For Polymarket: https://t.me/okdotbet_bot?start=events_{event_id}
      // Use eventId if available (fetched from Gamma API)
      if (!eventData.eventId) return null;
      return `https://t.me/okdotbet_bot?start=events_${eventData.eventId}`;
    } else if (eventData.pmType === 'Kalshi') {
      // For Kalshi: https://t.me/okdotbet_bot?start=kalshi_{event_ticker}
      return `https://t.me/okdotbet_bot?start=kalshi_${eventData.eventIdentifier}`;
    }
    return null;
  }, [eventData]);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdown) {
        const ref = dropdownRefs.current[openDropdown];
        if (ref && !ref.contains(event.target as Node)) {
          setOpenDropdown(null);
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openDropdown]);

  const getModelLabel = (model: string) => {
    return ALL_MODELS.find(m => m.value === model)?.label || model;
  };

  const getProviderBadge = (model: string) => {
    const modelOption = ALL_MODELS.find(m => m.value === model);
    return modelOption?.provider === "openai" ? "OpenAI" : "xAI";
  };

  const addAgent = () => {
    setAgents(prev => [
      ...prev,
      { id: generateAgentId(), model: "", tools: undefined, userCommand: "", status: 'idle' }
    ]);
  };

  const updateAgentCommand = (agentId: string, command: string) => {
    setAgents(prev => prev.map(a => 
      a.id === agentId ? { ...a, userCommand: command } : a
    ));
  };

  const removeAgent = (agentId: string) => {
    if (agents.length <= 1) return;
    setAgents(prev => prev.filter(a => a.id !== agentId));
    setExpandedAgents(prev => {
      const next = new Set(prev);
      next.delete(agentId);
      return next;
    });
  };

  const updateAgentModel = (agentId: string, model: string) => {
    setAgents(prev => prev.map(a => {
      if (a.id !== agentId) return a;
      
      // When switching to OpenAI, only keep polyfactual tool (not Grok-only tools)
      let newTools = a.tools;
      if (isOpenAIModel(model) && a.tools) {
        newTools = a.tools.filter(t => t === 'polyfactual') as AgentTool[];
        if (newTools.length === 0) newTools = undefined;
      }
      
      return { ...a, model, tools: newTools };
    }));
    setOpenDropdown(null);
  };

  const updateAgentTools = (agentId: string, tool: AgentTool) => {
    setAgents(prev => prev.map(a => {
      if (a.id !== agentId) return a;
      
      const currentTool = a.tools?.[0];
      const isSelected = currentTool === tool;
      
      // Toggle: if same tool clicked, deselect; otherwise select the new one
      const newTools: AgentTool[] | undefined = isSelected ? undefined : [tool];
      
      // Check if this is a Grok-only tool
      const isGrokOnlyTool = tool === 'x_search' || tool === 'web_search';
      
      // If selecting a Grok-only tool and current model is OpenAI or empty, switch to Grok
      let newModel = a.model;
      if (newTools && isGrokOnlyTool && (isOpenAIModel(a.model) || !a.model)) {
        newModel = "grok-4-1-fast-reasoning";
      }
      
      return { ...a, tools: newTools, model: newModel };
    }));
    setOpenDropdown(null);
  };

  const updateAggregatorModel = (model: string) => {
    setAggregator(prev => ({ ...prev, model }));
    setOpenDropdown(null);
  };

  const toggleAgentExpanded = (agentId: string) => {
    setExpandedAgents(prev => {
      const next = new Set(prev);
      if (next.has(agentId)) {
        next.delete(agentId);
      } else {
        next.add(agentId);
      }
      return next;
    });
  };

  const runAgents = async () => {
    if (!url.trim()) {
      setError("Please enter a prediction market URL");
      return;
    }

    // Check if all agents have models selected
    const agentsWithoutModels = agents.filter(a => !a.model);
    if (agentsWithoutModels.length > 0) {
      setError("Please select a model for all agents");
      return;
    }

    // Check if aggregator has a model when there are multiple agents
    if (agents.length > 1 && !aggregator.model) {
      setError("Please select a model for the aggregator");
      return;
    }

    setError(null);
    setIsRunning(true);
    setExpandedAgents(new Set());
    setExpandedAggregator(false);
    
    // Reset all statuses
    setAgents(prev => prev.map(a => ({ ...a, status: 'idle', result: undefined, error: undefined })));
    setAggregator(prev => ({ ...prev, status: 'idle', result: undefined, error: undefined }));
    setAutonomousOrderStatus('idle');
    setAutonomousOrderResult(null);

    try {
      // Step 1: Fetch event data
      setIsLoadingEvents(true);
      // Kalshi uses DFlow, Polymarket uses Dome
      const effectiveDataProvider = detectedUrlType === 'kalshi' ? 'dflow' : 'dome';
      
      const eventsResponse = await fetch("/api/get-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, dataProvider: effectiveDataProvider }),
      });
      
      const eventsData: GetEventsResponse = await eventsResponse.json();
      setIsLoadingEvents(false);
      
      if (!eventsData.success || !eventsData.markets || !eventsData.eventIdentifier || !eventsData.pmType) {
        throw new Error(eventsData.error || "Failed to fetch event data");
      }

      setEventData({
        eventIdentifier: eventsData.eventIdentifier,
        eventId: eventsData.eventId,
        pmType: eventsData.pmType,
        markets: eventsData.markets,
      });

      // Step 2: Run each agent sequentially
      const completedAnalyses: { agentId: string; model: string; analysis: MarketAnalysis }[] = [];
      
      for (let i = 0; i < agents.length; i++) {
        const agent = agents[i];
        
        // Update status to running
        setAgents(prev => prev.map(a => 
          a.id === agent.id ? { ...a, status: 'running' } : a
        ));

        try {
          // Filter out polyfactual from tools (it's handled separately)
          const grokTools = agent.tools?.filter(t => t === 'x_search' || t === 'web_search') as GrokTool[] | undefined;
          const hasPolyfactual = agent.tools?.includes('polyfactual');

          const agentResponse = await fetch("/api/event-analysis-agent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              markets: eventsData.markets,
              eventIdentifier: eventsData.eventIdentifier,
              pmType: eventsData.pmType,
              model: agent.model,
              tools: grokTools && grokTools.length > 0 ? grokTools : undefined,
              userCommand: agent.userCommand?.trim() || undefined,
            }),
          });

          const agentData: EventAnalysisAgentResponse = await agentResponse.json();

          if (!agentData.success || !agentData.data) {
            throw new Error(agentData.error || "Agent analysis failed");
          }

          // If polyfactual tool is enabled, fetch research for this market
          let polyfactualResearch: PolyfactualResearchResult | undefined;
          if (hasPolyfactual && agentData.data.title) {
            try {
              const polyfactualResponse = await fetch("/api/polyfactual-research", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  query: agentData.data.title,
                }),
              });
              
              const polyfactualData: PolyfactualResearchResponse = await polyfactualResponse.json();
              
              if (polyfactualData.success && polyfactualData.answer) {
                polyfactualResearch = {
                  answer: polyfactualData.answer,
                  citations: polyfactualData.citations || [],
                  query: agentData.data.title,
                };
              }
            } catch (pfError) {
              console.warn("Failed to fetch Polyfactual research:", pfError);
              // Continue without polyfactual research - don't fail the whole agent
            }
          }

          // Update status to completed
          setAgents(prev => prev.map(a => 
            a.id === agent.id ? { 
              ...a, 
              status: 'completed', 
              result: agentData.data,
              polyfactualResearch,
            } : a
          ));

          completedAnalyses.push({
            agentId: agent.id,
            model: agent.model,
            analysis: agentData.data,
          });

        } catch (agentError) {
          setAgents(prev => prev.map(a => 
            a.id === agent.id ? { 
              ...a, 
              status: 'error', 
              error: agentError instanceof Error ? agentError.message : "Unknown error" 
            } : a
          ));
        }
      }

      // Step 3: Run aggregator if more than one agent completed successfully
      if (completedAnalyses.length >= 2) {
        setAggregator(prev => ({ ...prev, status: 'running' }));

        try {
          const aggregatorResponse = await fetch("/api/bookmaker-agent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              analyses: completedAnalyses,
              eventIdentifier: eventsData.eventIdentifier,
              pmType: eventsData.pmType,
              model: aggregator.model,
            }),
          });

          const aggregatorData: AnalysisAggregatorResponse = await aggregatorResponse.json();

          if (!aggregatorData.success || !aggregatorData.data) {
            throw new Error(aggregatorData.error || "Aggregation failed");
          }

          setAggregator(prev => ({ ...prev, status: 'completed', result: aggregatorData.data }));
          setExpandedAggregator(true); // Auto-expand aggregator when done

          // Autonomous mode: Place order based on aggregated recommendation
          if (analysisMode === 'autonomous' && eventsData.pmType === 'Polymarket' && aggregatorData.data) {
            await placeAutonomousOrder(
              aggregatorData.data,
              eventsData.eventIdentifier,
              eventsData.markets
            );
          }

        } catch (aggError) {
          setAggregator(prev => ({ 
            ...prev, 
            status: 'error', 
            error: aggError instanceof Error ? aggError.message : "Unknown error" 
          }));
        }
      } else if (completedAnalyses.length === 1 && analysisMode === 'autonomous' && eventsData.pmType === 'Polymarket') {
        // Single agent autonomous mode: Place order based on agent recommendation
        const agentResult = completedAnalyses[0].analysis;
        await placeAutonomousOrder(
          agentResult,
          eventsData.eventIdentifier,
          eventsData.markets
        );
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsRunning(false);
      setIsLoadingEvents(false);
    }
  };

  /**
   * Place an autonomous order on Polymarket based on agent recommendation
   * Uses Mapper Agent to translate analysis output to Polymarket order parameters
   */
  const placeAutonomousOrder = async (
    analysisResult: MarketAnalysis,
    marketSlug: string,
    markets: unknown[]
  ) => {
    // Only proceed if there's a buy recommendation
    if (analysisResult.recommendedAction === "NO TRADE") {
      setAutonomousOrderStatus('skipped');
      setAutonomousOrderResult({ errorMsg: "Agents recommend NO TRADE - order not placed" });
      return;
    }

    const side = analysisResult.recommendedAction === "BUY YES" ? "YES" : "NO";
    
    // Get the first market for data extraction
    const market = markets[0] as Record<string, unknown>;
    
    setAutonomousOrderStatus('placing');
    setAutonomousOrderResult(null);

    try {
      // Step 1: Call Mapper Agent to translate analysis to order params
      console.log("Calling Mapper Agent...");
      const mapperResponse = await fetch("/api/mapper-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: "Polymarket",
          analysisResult: {
            recommendedAction: analysisResult.recommendedAction,
            predictedWinner: analysisResult.predictedWinner,
            winnerConfidence: analysisResult.winnerConfidence,
            marketProbability: analysisResult.marketProbability,
            estimatedActualProbability: analysisResult.estimatedActualProbability,
            ticker: analysisResult.ticker,
            title: analysisResult.title,
          },
          marketData: {
            conditionId: market.conditionId,
            slug: marketSlug,
            clobTokenIds: market.clobTokenIds,
            outcomes: market.outcomes,
            outcomePrices: market.outcomePrices,
            acceptingOrders: market.acceptingOrders,
            active: market.active,
            closed: market.closed,
            minimumTickSize: market.minimumTickSize,
            negRisk: market.negRisk,
            title: market.title || market.question,
          },
          budgetUsd: autonomousBudget,
        }),
      });

      const mapperData = await mapperResponse.json();

      if (!mapperData.success) {
        setAutonomousOrderStatus('error');
        setAutonomousOrderResult({
          errorMsg: mapperData.error || "Mapper Agent failed",
          side,
        });
        return;
      }

      console.log("Mapper Agent response:", mapperData.data?.orderParams);

      // Step 2: Call polymarket-put-order with mapper output
      console.log("Placing order via polymarket-put-order...");
      const orderResponse = await fetch("/api/polymarket-put-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderParams: mapperData.data.orderParams,
        }),
      });

      const orderData = await orderResponse.json();

      if (!orderData.success) {
        setAutonomousOrderStatus('error');
        setAutonomousOrderResult({
          errorMsg: orderData.error || "Order placement failed",
          side,
        });
        return;
      }

      setAutonomousOrderStatus('success');
      setAutonomousOrderResult({
        orderId: orderData.data?.order?.orderId,
        side: mapperData.data?.analysis?.side || side,
        size: orderData.data?.order?.size,
        price: orderData.data?.order?.price,
        costUsd: orderData.data?.order?.costUsd,
      });
    } catch (orderError) {
      setAutonomousOrderStatus('error');
      setAutonomousOrderResult({
        errorMsg: orderError instanceof Error ? orderError.message : "Unknown error",
        side,
      });
    }
  };

  const getToolLabel = (tool: AgentTool): string => {
    switch (tool) {
      case 'x_search': return 'X Search';
      case 'web_search': return 'Web Search';
      case 'polyfactual': return 'PolyFactual Research';
      default: return tool;
    }
  };

  const getToolShortLabel = (tool: AgentTool): string => {
    switch (tool) {
      case 'x_search': return 'X';
      case 'web_search': return 'Web';
      case 'polyfactual': return 'PF';
      default: return tool;
    }
  };

  const renderToolsDropdown = (
    agentId: string,
    selectedTools: AgentTool[] | undefined,
    disabled: boolean,
    isOpenAI: boolean,
    zIndex: number
  ) => {
    const dropdownId = `tools-${agentId}`;
    const hasTools = selectedTools && selectedTools.length > 0;
    
    return (
      <div 
        className="relative" 
        ref={el => { dropdownRefs.current[dropdownId] = el; }}
        style={{ zIndex: openDropdown === dropdownId ? 1000 : zIndex }}
      >
        <button
          type="button"
          onClick={() => !disabled && setOpenDropdown(openDropdown === dropdownId ? null : dropdownId)}
          disabled={disabled}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs transition-all font-mono whitespace-nowrap ${
            disabled 
              ? 'bg-secondary/30 border-border/50 text-muted-foreground/50 cursor-not-allowed' 
              : hasTools
              ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-500'
              : 'bg-secondary/50 border-border text-muted-foreground hover:text-foreground hover:border-primary/50'
          }`}
        >
          <Wrench className="w-3 h-3" />
          <span className="hidden sm:inline">
            {hasTools ? getToolLabel(selectedTools[0]) : 'Tools'}
          </span>
          <span className="sm:hidden">
            {hasTools ? getToolShortLabel(selectedTools[0]) : '-'}
          </span>
          <ChevronDown className={`w-3 h-3 transition-transform ${openDropdown === dropdownId ? 'rotate-180' : ''}`} />
        </button>
        
        {openDropdown === dropdownId && (
          <div className="absolute right-0 top-full mt-1 w-52 bg-card border border-border rounded-lg shadow-xl overflow-hidden" style={{ zIndex: 1000 }}>
            <div className="px-3 py-2 bg-cyan-500/10 border-b border-border">
              <div className="flex items-center gap-2">
                <Wrench className="w-3 h-3 text-cyan-400" />
                <span className="text-xs font-semibold text-cyan-400">Agent Tools</span>
              </div>
            </div>
            <div className="py-1">
              {TOOL_OPTIONS.map((tool) => {
                const isSelected = selectedTools?.includes(tool.value);
                const isGrokOnlyDisabled = tool.grokOnly && isOpenAI;
                return (
                  <button
                    key={tool.value}
                    type="button"
                    onClick={() => !isGrokOnlyDisabled && updateAgentTools(agentId, tool.value)}
                    disabled={isGrokOnlyDisabled}
                    className={`w-full px-4 py-2.5 text-left text-sm font-mono transition-colors flex items-center justify-between ${
                      isGrokOnlyDisabled
                        ? 'text-muted-foreground/40 cursor-not-allowed'
                        : isSelected
                        ? 'bg-cyan-500/20 text-cyan-400'
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {tool.label}
                      {tool.grokOnly && (
                        <span className="text-[9px] px-1 py-0.5 rounded bg-orange-500/20 text-orange-400">Grok</span>
                      )}
                    </span>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </button>
                );
              })}
            </div>
            {isOpenAI && (
              <div className="px-3 py-2 border-t border-border bg-secondary/30">
                <p className="text-[10px] text-muted-foreground">
                  X/Web search only work with Grok
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderModelDropdown = (
    id: string,
    selectedModel: string,
    onSelect: (model: string) => void,
    disabled: boolean,
    zIndex: number,
    restrictToGrok: boolean = false
  ) => (
    <div 
      className="relative" 
      ref={el => { dropdownRefs.current[id] = el; }}
      style={{ zIndex: openDropdown === id ? 1000 : zIndex }}
    >
      <button
        type="button"
        onClick={() => !disabled && setOpenDropdown(openDropdown === id ? null : id)}
        disabled={disabled}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs transition-all font-mono whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed ${
          selectedModel
            ? 'bg-secondary/50 border-border text-muted-foreground hover:text-foreground hover:border-primary/50'
            : 'bg-secondary/50 border-border text-muted-foreground hover:text-foreground hover:border-primary/50'
        }`}
      >
        {selectedModel && (
          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
            getProviderBadge(selectedModel) === "OpenAI" 
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50" 
              : "bg-orange-500/20 text-orange-400 border border-orange-500/50"
          }`}>
            {getProviderBadge(selectedModel)}
          </span>
        )}
        <span className="hidden sm:inline">{selectedModel ? getModelLabel(selectedModel) : 'Models'}</span>
        <span className="sm:hidden">Models</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${openDropdown === id ? 'rotate-180' : ''}`} />
      </button>
      
      {openDropdown === id && (
        <div className="absolute right-0 top-full mt-1 w-72 bg-card border border-border rounded-lg shadow-xl overflow-hidden max-h-[400px] overflow-y-auto" style={{ zIndex: 1000 }}>
          {/* Grok Section */}
          <div className="px-3 py-2 bg-orange-500/10 border-b border-border sticky top-0 z-10">
            <div className="flex items-center gap-2">
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/50">
                xAI
              </span>
              <span className="text-xs font-semibold text-orange-400">Grok Models</span>
            </div>
          </div>
          <div className="py-1">
            {GROK_MODELS.map((model) => (
              <button
                key={model.value}
                type="button"
                onClick={() => onSelect(model.value)}
                className={`w-full px-4 py-2.5 text-left text-sm font-mono transition-colors ${
                  selectedModel === model.value
                    ? 'bg-primary/20 text-primary'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                <span className="block">{model.label}</span>
                <span className="block text-[10px] opacity-60 mt-0.5">{model.value}</span>
              </button>
            ))}
          </div>
          
          {/* OpenAI Section - Only show if not restricted to Grok */}
          {!restrictToGrok && (
            <>
              <div className="px-3 py-2 bg-emerald-500/10 border-y border-border sticky top-0 z-10">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/50">
                    OpenAI
                  </span>
                  <span className="text-xs font-semibold text-emerald-400">GPT Models</span>
                </div>
              </div>
              <div className="py-1">
                {OPENAI_MODELS.map((model) => (
                  <button
                    key={model.value}
                    type="button"
                    onClick={() => onSelect(model.value)}
                    className={`w-full px-4 py-2.5 text-left text-sm font-mono transition-colors ${
                      selectedModel === model.value
                        ? 'bg-primary/20 text-primary'
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    }`}
                  >
                    <span className="block">{model.label}</span>
                    <span className="block text-[10px] opacity-60 mt-0.5">{model.value}</span>
                  </button>
                ))}
              </div>
            </>
          )}
          
          {/* Info message when restricted to Grok */}
          {restrictToGrok && (
            <div className="px-3 py-2 border-t border-border bg-secondary/30">
              <p className="text-[10px] text-muted-foreground">
                OpenAI models hidden (tools are enabled)
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderAgentStatus = (status: AgentConfig['status']) => {
    switch (status) {
      case 'running':
        return (
          <div className="relative">
            <Cpu className="w-4 h-4 text-primary" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-6 h-6 border border-primary/50 rounded-full processing-ring" 
                   style={{ borderTopColor: 'transparent', borderRightColor: 'transparent' }} />
            </div>
          </div>
        );
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-success success-check" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-destructive" />;
      default:
        return <CircleDot className="w-4 h-4 text-muted-foreground" />;
    }
  };

  // Render the animated connector between workflow steps
  const renderWorkflowConnector = (
    variant: 'agent' | 'aggregator' | 'okbet' = 'agent',
    isActive: boolean = false,
    isCompleted: boolean = false
  ) => {
    const colorClass = variant === 'aggregator' 
      ? 'data-flow-line-aggregator' 
      : variant === 'okbet' 
      ? 'data-flow-line-okbet' 
      : '';
    
    return (
      <div className="flex justify-center py-1 relative">
        <div className={`relative h-8 ${isActive || isCompleted ? '' : 'opacity-30'}`}>
          {/* Main connector line */}
          <div className={`data-flow-line h-full ${colorClass} ${isActive ? 'data-flow-multi' : ''}`} />
          
          {/* Pulsing dot at bottom */}
          {isCompleted && (
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
              <div className={`w-2 h-2 rounded-full ${
                variant === 'aggregator' ? 'bg-violet-400' : 
                variant === 'okbet' ? 'bg-amber-400' : 'bg-primary'
              } pulse-live`} />
            </div>
          )}
        </div>
        
        {/* Side decorative dots */}
        {isActive && (
          <>
            <div className={`absolute left-1/2 top-1/2 -translate-x-8 w-1 h-1 rounded-full ${
              variant === 'aggregator' ? 'bg-violet-400/50' : 
              variant === 'okbet' ? 'bg-amber-400/50' : 'bg-primary/50'
            } animate-ping`} style={{ animationDuration: '2s' }} />
            <div className={`absolute left-1/2 top-1/2 translate-x-6 w-1 h-1 rounded-full ${
              variant === 'aggregator' ? 'bg-violet-400/50' : 
              variant === 'okbet' ? 'bg-amber-400/50' : 'bg-primary/50'
            } animate-ping`} style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
          </>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-[calc(100vh-80px)] px-2 py-4 md:px-4 md:py-6">
      <div className="max-w-6xl mx-auto">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center py-8 fade-in">
            <h2 className="font-display text-xl md:text-2xl font-bold text-primary text-glow mb-4">
              Agentic Market Analysis
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto mb-6">
              Deploy multiple AI agents to analyze prediction markets. Each agent provides independent analysis, then a judge agent synthesizes all perspectives.
            </p>
            <a 
              href="https://pond.dflow.net/introduction" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border border-border/50 text-xs text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors"
            >
              <span className="text-violet-400 font-bold">DF</span>
              <span>Powered by DFlow</span>
            </a>
          </div>

          {/* Error Display */}
          {error && (
            <div className="border border-destructive/50 rounded-lg bg-destructive/10 p-4 fade-in">
              <p className="text-destructive text-sm font-mono">{`> Error: ${error}`}</p>
            </div>
          )}

          {/* URL Input */}
          <div className="relative border border-border rounded-lg bg-card/80 backdrop-blur-sm border-glow">
            <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground font-display">
                  MARKET URL INPUT
                </span>
              </div>
            </div>
            
            <div className={`flex items-center gap-3 p-4 ${detectedUrlType !== 'none' ? 'pb-10' : ''}`}>
              <span className="text-primary font-bold">{">"}</span>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste Kalshi or Polymarket URL ..."
                disabled={isRunning}
                className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/50 font-mono"
              />
            </div>
            
            {/* Data Provider Display */}
            {detectedUrlType !== 'none' && (
              <div className="absolute bottom-3 right-4 flex items-center gap-1">
                {detectedUrlType === 'kalshi' ? (
                  <span className="px-2 py-0.5 text-[10px] font-mono bg-violet-500/20 text-violet-400 rounded-md border border-violet-500/30">
                    DFlow
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-[10px] font-mono bg-cyan-500/20 text-cyan-400 rounded-md border border-cyan-500/30">
                    Dome
                  </span>
                )}
              </div>
            )}
            
            {isLoadingEvents && (
              <div className="px-4 pb-3">
                <div className="relative flex items-center gap-3 p-2 rounded-md bg-primary/5 border border-primary/20 overflow-hidden">
                  {/* Animated background */}
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/10 to-primary/0"
                       style={{ animation: 'shimmer 1.5s infinite' }} />
                  
                  <div className="relative flex items-center gap-2 text-xs text-primary font-mono">
                    <div className="relative">
                      <Link2 className="w-3.5 h-3.5" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-5 h-5 border border-primary/50 rounded-full processing-ring" 
                             style={{ borderTopColor: 'transparent', borderRightColor: 'transparent' }} />
                      </div>
                    </div>
                    <span className="typing-dots">Fetching market data</span>
                  </div>
                  
                  {/* Progress dots */}
                  <div className="relative ml-auto flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: '200ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: '400ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Agent Configuration Section */}
          <div className={`relative space-y-3 p-4 -mx-4 rounded-xl transition-all duration-500 ${
            isRunning 
              ? 'bg-gradient-to-b from-primary/5 via-transparent to-violet-500/5 circuit-pattern' 
              : ''
          }`}>
            {/* Animated border when running */}
            {isRunning && (
              <div className="absolute inset-0 rounded-xl border border-primary/20 pointer-events-none overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-px gradient-border-animate" />
                <div className="absolute bottom-0 left-0 right-0 h-px gradient-border-animate" style={{ animationDelay: '-1.5s' }} />
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className={`font-display text-sm transition-colors ${
                  isRunning ? 'text-primary' : 'text-muted-foreground'
                }`}>ANALYSIS AGENTS</h3>
                {/* Mode Toggle */}
                <div className="flex items-center bg-secondary/50 rounded-md border border-border/50 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setAnalysisMode('supervised')}
                    disabled={isRunning}
                    className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono transition-all ${
                      analysisMode === 'supervised'
                        ? 'bg-amber-500/20 text-amber-400 border-r border-amber-500/30'
                        : 'text-muted-foreground hover:text-foreground border-r border-border/50'
                    }`}
                  >
                    <Eye className="w-3 h-3" />
                    Supervised
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnalysisMode('autonomous')}
                    disabled={isRunning}
                    className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono transition-all ${
                      analysisMode === 'autonomous'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Zap className="w-3 h-3" />
                    Autonomous
                  </button>
                </div>
              </div>
              
              {/* Autonomous Mode Budget Input */}
              {analysisMode === 'autonomous' && (
                <div className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
                  isAutonomousAvailable 
                    ? 'bg-emerald-500/10 border border-emerald-500/30' 
                    : 'bg-emerald-500/5 border border-emerald-500/20'
                }`}>
                  <div className="flex items-center gap-2">
                    <Coins className={`w-4 h-4 ${isAutonomousAvailable ? 'text-emerald-400' : 'text-emerald-400/60'}`} />
                    <span className={`text-xs font-display ${isAutonomousAvailable ? 'text-emerald-400' : 'text-emerald-400/60'}`}>BUDGET</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-mono text-sm ${isAutonomousAvailable ? 'text-emerald-400' : 'text-emerald-400/60'}`}>$</span>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={autonomousBudget}
                      onChange={(e) => setAutonomousBudget(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
                      disabled={isRunning}
                      className={`w-16 bg-secondary/50 border rounded px-2 py-1 text-sm font-mono focus:outline-none disabled:opacity-50 ${
                        isAutonomousAvailable 
                          ? 'border-emerald-500/30 text-emerald-300 focus:border-emerald-400' 
                          : 'border-emerald-500/20 text-emerald-300/60 focus:border-emerald-400/50'
                      }`}
                    />
                  </div>
                  <span className={`text-[10px] ${isAutonomousAvailable ? 'text-emerald-400/70' : 'text-emerald-400/50'}`}>($1 - $100)</span>
                  <div className="ml-auto flex items-center gap-1.5 text-[10px]">
                    {isAutonomousAvailable ? (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono">Polymarket</span>
                    ) : detectedUrlType === 'kalshi' ? (
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-mono">Kalshi - Soon</span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">Polymarket Only (Kalshi Soon)</span>
                    )}
                  </div>
                </div>
              )}
              <button
                onClick={addAgent}
                disabled={isRunning}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary/10 border border-primary/30 text-primary text-xs font-display hover:bg-primary/20 hover:border-primary/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-3 h-3" />
                Add Agent
              </button>
            </div>

            {/* Workflow Pipeline Progress Indicator */}
            {isRunning && (
              <div className="mb-4 p-3 rounded-lg bg-card/40 border border-border/50 backdrop-blur-sm stagger-fade-in">
                <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
                  {/* Stage indicators */}
                  {agents.map((agent, index) => {
                    const isActive = agent.status === 'running';
                    const isComplete = agent.status === 'completed';
                    const isPending = agent.status === 'idle';
                    
                    return (
                      <div key={agent.id} className="flex items-center gap-2 flex-shrink-0">
                        {/* Agent indicator */}
                        <div className={`relative flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-300 ${
                          isComplete 
                            ? 'border-success bg-success/20' 
                            : isActive 
                            ? 'border-primary bg-primary/20 glow-pulse-active' 
                            : 'border-border/50 bg-card/50'
                        }`}>
                          {isComplete ? (
                            <CheckCircle2 className="w-4 h-4 text-success" />
                          ) : isActive ? (
                            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <span className="text-xs font-mono text-muted-foreground">{index + 1}</span>
                          )}
                          
                          {/* Active glow ring */}
                          {isActive && (
                            <div className="absolute inset-0 rounded-full border border-primary/50 animate-ping" 
                                 style={{ animationDuration: '2s' }} />
                          )}
                        </div>
                        
                        {/* Arrow to next stage */}
                        {(index < agents.length - 1 || showAggregator || analysisMode === 'supervised') && (
                          <div className={`flex items-center transition-all ${
                            isComplete ? 'text-primary' : 'text-border'
                          }`}>
                            <div className={`w-6 h-0.5 ${isComplete ? 'bg-primary' : 'bg-border/50'}`} />
                            <ArrowDown className={`w-3 h-3 -rotate-90 -ml-1 ${
                              isComplete ? 'text-primary connector-arrow' : ''
                            }`} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {/* Aggregator indicator */}
                  {showAggregator && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className={`relative flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-300 ${
                        aggregator.status === 'completed' 
                          ? 'border-success bg-success/20' 
                          : aggregator.status === 'running' 
                          ? 'border-violet-400 bg-violet-500/20 glow-pulse-violet' 
                          : 'border-violet-500/30 bg-violet-500/10'
                      }`}>
                        {aggregator.status === 'completed' ? (
                          <CheckCircle2 className="w-4 h-4 text-success" />
                        ) : aggregator.status === 'running' ? (
                          <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Layers className="w-3 h-3 text-violet-400/60" />
                        )}
                        
                        {aggregator.status === 'running' && (
                          <div className="absolute inset-0 rounded-full border border-violet-400/50 animate-ping" 
                               style={{ animationDuration: '2s' }} />
                        )}
                      </div>
                      
                      {/* Arrow to OkBet */}
                      {analysisMode === 'supervised' && (
                        <div className={`flex items-center transition-all ${
                          aggregator.status === 'completed' ? 'text-violet-400' : 'text-border'
                        }`}>
                          <div className={`w-6 h-0.5 ${aggregator.status === 'completed' ? 'bg-violet-400' : 'bg-border/50'}`} />
                          <ArrowDown className={`w-3 h-3 -rotate-90 -ml-1 ${
                            aggregator.status === 'completed' ? 'text-violet-400 connector-arrow' : ''
                          }`} />
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* OkBet indicator */}
                  {analysisMode === 'supervised' && (
                    <div className="flex items-center flex-shrink-0">
                      <div className={`relative flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-300 ${
                        isAnalysisComplete && getOkBetLink
                          ? 'border-amber-400 bg-amber-500/20' 
                          : 'border-amber-500/30 bg-amber-500/10'
                      }`}>
                        {isAnalysisComplete && getOkBetLink ? (
                          <CheckCircle2 className="w-4 h-4 text-amber-400" />
                        ) : (
                          <Image 
                            src="/okbet.svg" 
                            alt="OkBet" 
                            width={14} 
                            height={14} 
                            className="w-3.5 h-3.5 opacity-60"
                          />
                        )}
                        
                        {isAnalysisComplete && getOkBetLink && (
                          <div className="absolute inset-0 rounded-full border border-amber-400/50 animate-ping" 
                               style={{ animationDuration: '2s' }} />
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Stage labels */}
                <div className="flex items-center justify-between mt-2 text-[9px] font-mono text-muted-foreground">
                  <span className="flex-shrink-0">Agents ({agents.filter(a => a.status === 'completed').length}/{agents.length})</span>
                  {showAggregator && <span className="flex-shrink-0">Aggregator</span>}
                  {analysisMode === 'supervised' && <span className="flex-shrink-0">OkBet</span>}
                </div>
              </div>
            )}

            {/* Agent Boxes */}
            <div className="space-y-0">
              {agents.map((agent, index) => {
                const isExpanded = expandedAgents.has(agent.id);
                const hasResult = agent.status === 'completed' && agent.result;
                // Higher index agents get lower z-index so dropdowns from earlier agents appear on top
                const agentZIndex = 100 - index;
                const isCurrentlyRunning = agent.status === 'running';
                const isCompleted = agent.status === 'completed';
                const previousCompleted = index > 0 && agents[index - 1].status === 'completed';
                
                return (
                  <div key={agent.id}>
                    {/* Connector from previous agent */}
                    {index > 0 && (
                      renderWorkflowConnector(
                        'agent',
                        isCurrentlyRunning || previousCompleted,
                        previousCompleted
                      )
                    )}
                    
                    <div 
                      className={`relative border rounded-lg bg-card/60 backdrop-blur-sm transition-all duration-300 ${
                        isCurrentlyRunning 
                          ? 'border-primary/70 glow-pulse-active agent-card-active' 
                          : isCompleted
                          ? 'border-success/50 completion-burst'
                          : agent.status === 'error'
                          ? 'border-destructive/50'
                          : 'border-border'
                      }`}
                      style={{ 
                        zIndex: agentZIndex,
                        animationDelay: isCompleted ? `${index * 100}ms` : '0ms'
                      }}
                    >
                      {/* Processing indicator bar */}
                      {isCurrentlyRunning && (
                        <div className="absolute top-0 left-0 right-0 h-0.5 overflow-hidden rounded-t-lg">
                          <div className="h-full gradient-border-animate" />
                        </div>
                      )}
                      
                      {/* Label Header */}
                      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
                        <div className="flex items-center gap-2">
                          <Bot className={`w-4 h-4 ${isCurrentlyRunning ? 'text-primary' : isCompleted ? 'text-success' : 'text-primary/70'}`} />
                          <span className={`text-xs font-display uppercase tracking-wide ${
                            isCurrentlyRunning ? 'text-primary' : isCompleted ? 'text-success' : 'text-muted-foreground'
                          }`}>
                            Predict Agent {index + 1}
                          </span>
                        </div>
                        {agents.length > 1 && (
                          <button
                            onClick={() => removeAgent(agent.id)}
                            disabled={isRunning}
                            className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-3">
                          {renderAgentStatus(agent.status)}
                          <span className={`font-display text-sm transition-colors ${
                            isCurrentlyRunning ? 'text-primary' : 'text-foreground'
                          }`}>
                            {isCurrentlyRunning && (
                              <span className="text-primary/70 text-xs typing-dots">analyzing</span>
                            )}
                            {isCompleted && (
                              <span className="text-success/70 text-xs">complete</span>
                            )}
                            {agent.status === 'idle' && (
                              <span className="text-muted-foreground text-xs">ready</span>
                            )}
                          </span>
                          {agent.status === 'error' && agent.error && (
                            <span className="text-xs text-destructive truncate max-w-[200px]">
                              {agent.error}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Expand Analysis Button - Only show when completed */}
                          {hasResult && (
                            <button
                              onClick={() => toggleAgentExpanded(agent.id)}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-success/10 border border-success/30 text-success text-xs font-display hover:bg-success/20 hover:border-success/50 transition-all stagger-fade-in"
                            >
                              <FileText className="w-3 h-3" />
                              <span className="hidden sm:inline">Agent&apos;s Analysis</span>
                              <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>
                          )}
                          {renderToolsDropdown(
                            agent.id,
                            agent.tools,
                            isRunning,
                            isOpenAIModel(agent.model),
                            agentZIndex + 51
                          )}
                          {renderModelDropdown(
                            agent.id,
                            agent.model,
                            (model) => updateAgentModel(agent.id, model),
                            isRunning,
                            agentZIndex + 50,
                            // Only restrict to Grok when Grok-only tools are selected
                            agent.tools?.some(t => t === 'x_search' || t === 'web_search') ?? false
                          )}
                        </div>
                      </div>
                      
                      {/* Command Input Box */}
                      {!hasResult && (
                        <div className="px-4 pb-3">
                          <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-secondary/30 border border-border/50 focus-within:border-primary/50 focus-within:bg-secondary/50 transition-all">
                            <span className="text-primary/60 font-mono text-xs">{">"}</span>
                            <input
                              type="text"
                              value={agent.userCommand || ""}
                              onChange={(e) => updateAgentCommand(agent.id, e.target.value)}
                              placeholder="Commands (Optional)"
                              disabled={isRunning}
                              className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/40 font-mono text-xs disabled:opacity-50"
                            />
                          </div>
                        </div>
                      )}
                      
                      {/* Expandable Analysis Content */}
                      {hasResult && isExpanded && (
                        <div className="px-4 pb-4 border-t border-border/50 mt-2 pt-4 stagger-fade-in">
                          <AnalysisOutput
                            analysis={agent.result!}
                            timestamp={new Date()}
                            polyfactualResearch={agent.polyfactualResearch}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Aggregator Box - Only shows when multiple agents */}
              {showAggregator && (
                <>
                  {/* Connector to aggregator */}
                  {renderWorkflowConnector(
                    'aggregator',
                    aggregator.status === 'running' || agents.every(a => a.status === 'completed'),
                    agents.every(a => a.status === 'completed')
                  )}
                  
                  <div 
                    className={`relative border rounded-lg bg-gradient-to-r from-violet-500/5 via-purple-500/5 to-cyan-500/5 backdrop-blur-sm transition-all duration-300 ${
                      aggregator.status === 'running' 
                        ? 'border-violet-500/70 glow-pulse-violet agent-card-active overflow-hidden' 
                        : aggregator.status === 'completed'
                        ? 'border-success/50 completion-burst-violet'
                        : aggregator.status === 'error'
                        ? 'border-destructive/50'
                        : 'border-violet-500/30'
                    }`}
                    style={{ zIndex: openDropdown === 'aggregator' ? 1000 : 10 }}
                  >
                    {/* Processing indicator bar */}
                    {aggregator.status === 'running' && (
                      <div className="absolute top-0 left-0 right-0 h-0.5 overflow-hidden">
                        <div className="h-full w-full bg-gradient-to-r from-violet-500 via-purple-400 to-cyan-400 animate-pulse" 
                             style={{ animation: 'gradient-shift 2s linear infinite' }} />
                      </div>
                    )}
                    
                    {/* Background pattern when running */}
                    {aggregator.status === 'running' && (
                      <div className="absolute inset-0 neural-dots opacity-30 pointer-events-none" />
                    )}
                    
                    <div className="flex items-center justify-between px-4 py-3 relative">
                      <div className="flex items-center gap-3">
                        {aggregator.status === 'running' ? (
                          <div className="relative">
                            <Layers className="w-4 h-4 text-violet-400" />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-6 h-6 border border-violet-400/50 rounded-full processing-ring" 
                                   style={{ borderTopColor: 'transparent', borderRightColor: 'transparent' }} />
                            </div>
                            {/* Orbiting particles */}
                            <div className="absolute -inset-2 orbit-particles" />
                          </div>
                        ) : aggregator.status === 'completed' ? (
                          <CheckCircle2 className="w-4 h-4 text-success success-check" />
                        ) : aggregator.status === 'error' ? (
                          <XCircle className="w-4 h-4 text-destructive" />
                        ) : (
                          <Layers className="w-4 h-4 text-violet-400/60" />
                        )}
                        <div className="flex items-center gap-2">
                          <span className={`font-display text-sm transition-colors ${
                            aggregator.status === 'running' ? 'text-violet-300' : 'text-violet-400'
                          }`}>
                            Predict Bookmaker Agent
                            {aggregator.status === 'running' && (
                              <span className="text-violet-400/70 text-xs ml-2 typing-dots">synthesizing</span>
                            )}
                          </span>
                          <Sparkles className={`w-3 h-3 transition-all ${
                            aggregator.status === 'running' 
                              ? 'text-violet-400 animate-pulse' 
                              : 'text-violet-400/60'
                          }`} />
                        </div>
                        {aggregator.status === 'error' && aggregator.error && (
                          <span className="text-xs text-destructive truncate max-w-[200px]">
                            {aggregator.error}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Expand Aggregated Analysis Button */}
                        {aggregator.status === 'completed' && aggregator.result && (
                          <button
                            onClick={() => setExpandedAggregator(!expandedAggregator)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-violet-500/10 border border-violet-500/30 text-violet-400 text-xs font-display hover:bg-violet-500/20 hover:border-violet-500/50 transition-all stagger-fade-in"
                          >
                            <FileText className="w-3 h-3" />
                            <span className="hidden sm:inline">Aggregated Analysis</span>
                            <ChevronDown className={`w-3 h-3 transition-transform ${expandedAggregator ? 'rotate-180' : ''}`} />
                          </button>
                        )}
                        {renderModelDropdown(
                          'aggregator',
                          aggregator.model,
                          updateAggregatorModel,
                          isRunning,
                          60
                        )}
                      </div>
                    </div>
                    
                    {aggregator.status === 'idle' && (
                      <div className="px-4 pb-3">
                        <p className="text-[10px] text-muted-foreground">
                          Synthesizes all agent analyses into a consolidated assessment
                        </p>
                      </div>
                    )}
                    
                    {/* Expandable Aggregated Analysis Content */}
                    {aggregator.status === 'completed' && aggregator.result && expandedAggregator && (
                      <div className="px-4 pb-4 border-t border-violet-500/30 mt-2 pt-4 stagger-fade-in">
                        <AggregatedAnalysisOutput
                          analysis={aggregator.result}
                          timestamp={new Date()}
                          agentsCount={agents.filter(a => a.status === 'completed').length}
                        />
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* OkBet Box - Always shows in supervised mode */}
              {analysisMode === 'supervised' && (
                <>
                  {/* Connector to OkBet */}
                  {renderWorkflowConnector(
                    'okbet',
                    isAnalysisComplete,
                    isAnalysisComplete
                  )}
                  
                  <div 
                    className={`relative border rounded-lg bg-gradient-to-r from-amber-500/5 via-orange-500/5 to-yellow-500/5 backdrop-blur-sm transition-all duration-500 overflow-hidden ${
                      isAnalysisComplete && getOkBetLink
                        ? 'border-amber-500/70 completion-burst-amber'
                        : isRunning
                        ? 'border-amber-500/20 shimmer'
                        : 'border-amber-500/30'
                    }`}
                    style={{ zIndex: 5 }}
                  >
                    {/* Celebratory effect when link is ready */}
                    {isAnalysisComplete && getOkBetLink && (
                      <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-transparent to-amber-500/10 pointer-events-none" 
                           style={{ animation: 'shimmer 3s infinite' }} />
                    )}
                    
                    <div className="flex items-center justify-between px-4 py-3 relative">
                      <div className="flex items-center gap-3">
                        <div className={`relative ${isAnalysisComplete && getOkBetLink ? 'animate-bounce' : ''}`}
                             style={{ animationDuration: '2s' }}>
                          <Image 
                            src="/okbet.svg" 
                            alt="OkBet" 
                            width={20} 
                            height={20} 
                            className={`w-5 h-5 transition-all ${
                              isAnalysisComplete && getOkBetLink ? 'drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]' : ''
                            }`}
                          />
                        </div>
                        <span className={`font-display text-sm transition-colors ${
                          isAnalysisComplete && getOkBetLink ? 'text-amber-300' : 'text-amber-400'
                        }`}>
                          OkBet
                          {isRunning && (
                            <span className="text-amber-400/50 text-xs ml-2">waiting</span>
                          )}
                          {isAnalysisComplete && getOkBetLink && (
                            <span className="text-amber-300/70 text-xs ml-2">ready!</span>
                          )}
                        </span>
                      </div>
                      
                      {/* Ready indicator */}
                      {isAnalysisComplete && getOkBetLink && (
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-500/20 border border-amber-500/40">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 pulse-live" />
                          <span className="text-[10px] font-display text-amber-400">LINK READY</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="px-4 pb-4 relative">
                      {isAnalysisComplete ? (
                        getOkBetLink ? (
                          <div className="stagger-fade-in">
                            <p className="text-xs text-muted-foreground mb-3">
                              You can place bets through OkBet with the one-click link:
                            </p>
                            <a
                              href={getOkBetLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 px-3 py-2.5 rounded-md bg-amber-500/15 border border-amber-500/50 text-amber-300 text-sm font-mono hover:bg-amber-500/25 hover:border-amber-400 hover:text-amber-200 transition-all group shadow-lg shadow-amber-500/10"
                            >
                              <ExternalLink className="w-4 h-4 flex-shrink-0 group-hover:scale-110 transition-transform" />
                              <span className="truncate">{getOkBetLink}</span>
                              <ArrowDown className="w-3 h-3 ml-auto rotate-[-90deg] group-hover:translate-x-1 transition-transform" />
                            </a>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            OkBet link unavailable for this event.
                          </p>
                        )
                      ) : (
                        <div className={`text-xs text-muted-foreground ${isRunning ? 'shimmer rounded px-2 py-1' : ''}`}>
                          {isRunning ? (
                            <span className="typing-dots">Generating link</span>
                          ) : (
                            'The one-click OkBet links will appear here.'
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Autonomous Order Box - Shows in autonomous mode for Polymarket */}
              {analysisMode === 'autonomous' && isAutonomousAvailable && (
                <>
                  {/* Connector to Order */}
                  {renderWorkflowConnector(
                    'okbet', // reusing the amber color scheme
                    autonomousOrderStatus === 'placing' || isAnalysisComplete,
                    autonomousOrderStatus === 'success'
                  )}
                  
                  <div 
                    className={`relative border rounded-lg bg-gradient-to-r from-emerald-500/5 via-green-500/5 to-teal-500/5 backdrop-blur-sm transition-all duration-500 overflow-hidden ${
                      autonomousOrderStatus === 'success'
                        ? 'border-emerald-500/70 completion-burst'
                        : autonomousOrderStatus === 'placing'
                        ? 'border-emerald-500/50 shimmer'
                        : autonomousOrderStatus === 'error'
                        ? 'border-destructive/50'
                        : autonomousOrderStatus === 'skipped'
                        ? 'border-amber-500/50'
                        : 'border-emerald-500/30'
                    }`}
                    style={{ zIndex: 5 }}
                  >
                    {/* Success effect */}
                    {autonomousOrderStatus === 'success' && (
                      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-transparent to-emerald-500/10 pointer-events-none" 
                           style={{ animation: 'shimmer 3s infinite' }} />
                    )}
                    
                    <div className="flex items-center justify-between px-4 py-3 relative">
                      <div className="flex items-center gap-3">
                        <div className={`relative ${autonomousOrderStatus === 'success' ? 'animate-bounce' : ''}`}
                             style={{ animationDuration: '2s' }}>
                          <DollarSign className={`w-5 h-5 transition-all ${
                            autonomousOrderStatus === 'success' 
                              ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]' 
                              : autonomousOrderStatus === 'error'
                              ? 'text-destructive'
                              : 'text-emerald-400/70'
                          }`} />
                        </div>
                        <span className={`font-display text-sm transition-colors ${
                          autonomousOrderStatus === 'success' ? 'text-emerald-300' : 
                          autonomousOrderStatus === 'error' ? 'text-destructive' : 
                          autonomousOrderStatus === 'skipped' ? 'text-amber-400' : 'text-emerald-400'
                        }`}>
                          Autonomous Order
                          {autonomousOrderStatus === 'placing' && (
                            <span className="text-emerald-400/50 text-xs ml-2 typing-dots">placing</span>
                          )}
                          {autonomousOrderStatus === 'success' && (
                            <span className="text-emerald-300/70 text-xs ml-2">executed!</span>
                          )}
                          {autonomousOrderStatus === 'error' && (
                            <span className="text-destructive/70 text-xs ml-2">failed</span>
                          )}
                          {autonomousOrderStatus === 'skipped' && (
                            <span className="text-amber-400/70 text-xs ml-2">skipped</span>
                          )}
                        </span>
                      </div>
                      
                      {/* Status indicator */}
                      {autonomousOrderStatus === 'success' && (
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span className="text-[10px] font-display text-emerald-400">ORDER PLACED</span>
                        </div>
                      )}
                      {autonomousOrderStatus === 'placing' && (
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40">
                          <Loader2 className="w-3 h-3 text-emerald-400 animate-spin" />
                          <span className="text-[10px] font-display text-emerald-400">PLACING</span>
                        </div>
                      )}
                      {autonomousOrderStatus === 'skipped' && (
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-500/20 border border-amber-500/40">
                          <AlertCircle className="w-3 h-3 text-amber-400" />
                          <span className="text-[10px] font-display text-amber-400">NO TRADE</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="px-4 pb-4 relative">
                      {autonomousOrderStatus === 'success' && autonomousOrderResult ? (
                        <div className="stagger-fade-in space-y-2">
                          <p className="text-xs text-emerald-400/80">
                            Order successfully placed on Polymarket!
                          </p>
                          <div className="flex flex-wrap gap-2 text-xs">
                            <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                              {autonomousOrderResult.side}
                            </span>
                            <span className="px-2 py-1 rounded bg-secondary/50 text-muted-foreground font-mono">
                              {autonomousOrderResult.size} shares
                            </span>
                            <span className="px-2 py-1 rounded bg-secondary/50 text-muted-foreground font-mono">
                              @ {((autonomousOrderResult.price || 0) * 100).toFixed(1)}%
                            </span>
                            <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                              ${autonomousOrderResult.costUsd?.toFixed(2)}
                            </span>
                          </div>
                          {autonomousOrderResult.orderId && (
                            <p className="text-[10px] text-muted-foreground font-mono truncate">
                              Order ID: {autonomousOrderResult.orderId}
                            </p>
                          )}
                        </div>
                      ) : autonomousOrderStatus === 'error' && autonomousOrderResult ? (
                        <div className="text-xs text-destructive">
                          {autonomousOrderResult.errorMsg}
                        </div>
                      ) : autonomousOrderStatus === 'skipped' && autonomousOrderResult ? (
                        <div className="text-xs text-amber-400/80">
                          {autonomousOrderResult.errorMsg}
                        </div>
                      ) : autonomousOrderStatus === 'placing' ? (
                        <div className="text-xs text-emerald-400/70 shimmer rounded px-2 py-1">
                          <span className="typing-dots">Placing ${autonomousBudget} order</span>
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">
                          {isRunning ? (
                            <span>Waiting for agent analysis to complete...</span>
                          ) : (
                            <span>Order will be placed automatically based on agent recommendation (Budget: ${autonomousBudget})</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
              
              {/* Completion Summary - Shows when analysis is complete */}
              {isAnalysisComplete && !isRunning && (
                <div className="mt-4 stagger-fade-in">
                  <div className="relative p-4 rounded-lg bg-gradient-to-r from-success/5 via-primary/5 to-success/5 border border-success/30 overflow-hidden">
                    {/* Celebratory shimmer */}
                    <div className="absolute inset-0 bg-gradient-to-r from-success/0 via-success/10 to-success/0 pointer-events-none"
                         style={{ animation: 'shimmer 3s infinite' }} />
                    
                    <div className="relative flex items-start gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-success/20 border border-success/30">
                        <CheckCircle2 className="w-4 h-4 text-success success-check" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="font-display text-sm text-success mb-1">Analysis Complete</h4>
                        <p className="text-xs text-muted-foreground mb-3">
                          {agents.filter(a => a.status === 'completed').length} agent{agents.filter(a => a.status === 'completed').length > 1 ? 's' : ''} analyzed the market
                          {showAggregator && aggregator.status === 'completed' && ' with consolidated insights'}
                        </p>
                        
                        {/* Stats */}
                        <div className="flex flex-wrap gap-3">
                          {agents.filter(a => a.status === 'completed' && a.result).map((agent, idx) => (
                            <div key={agent.id} className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-card/60 border border-border/50 text-xs">
                              <Bot className="w-3 h-3 text-primary" />
                              <span className="text-muted-foreground">Predict Agent {idx + 1}:</span>
                              <span className={`font-mono ${
                                agent.result?.recommendedAction?.includes('YES') 
                                  ? 'text-success' 
                                  : agent.result?.recommendedAction?.includes('NO')
                                  ? 'text-destructive'
                                  : 'text-warning'
                              }`}>
                                {agent.result?.recommendedAction}
                              </span>
                            </div>
                          ))}
                          
                          {showAggregator && aggregator.status === 'completed' && aggregator.result && (
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-violet-500/10 border border-violet-500/30 text-xs">
                              <Layers className="w-3 h-3 text-violet-400" />
                              <span className="text-violet-400/80">Final:</span>
                              <span className={`font-mono font-semibold ${
                                aggregator.result.recommendedAction?.includes('YES') 
                                  ? 'text-success' 
                                  : aggregator.result.recommendedAction?.includes('NO')
                                  ? 'text-destructive'
                                  : 'text-warning'
                              }`}>
                                {aggregator.result.recommendedAction}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Run Button */}
          <button
            onClick={runAgents}
            disabled={isRunning || !url.trim() || agents.some(a => !a.model) || (agents.length > 1 && !aggregator.model)}
            className={`relative w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-lg border font-display text-sm transition-all overflow-hidden ${
              isRunning 
                ? 'bg-primary/10 border-primary/70 text-primary glow-pulse-active cursor-wait' 
                : 'bg-primary/20 border-primary/50 text-primary hover:bg-primary/30 hover:border-primary glow-primary disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            {/* Animated background when running */}
            {isRunning && (
              <>
                <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/20 to-primary/0"
                     style={{ animation: 'shimmer 2s infinite' }} />
                <div className="absolute top-0 left-0 right-0 h-1 overflow-hidden">
                  <div className="h-full gradient-border-animate" />
                </div>
              </>
            )}
            
            <div className="relative flex items-center gap-2">
              {isRunning ? (
                <>
                  <div className="relative">
                    <Cpu className="w-4 h-4" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-6 h-6 border border-primary/50 rounded-full processing-ring" 
                           style={{ borderTopColor: 'transparent', borderRightColor: 'transparent' }} />
                    </div>
                  </div>
                  <span className="typing-dots">Running Agents</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Run Agents
                </>
              )}
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgenticMarketAnalysis;
