"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Image from "next/image";
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
  Wrench
} from "lucide-react";
import type { DataProvider } from "@/types/api";
import type { 
  AgentConfig, 
  AggregatorConfig, 
  GetEventsResponse, 
  EventAnalysisAgentResponse,
  AnalysisAggregatorResponse,
  PmType,
  MarketAnalysis,
  GrokTool,
} from "@/types/agentic";
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
  value: GrokTool;
  label: string;
}

const TOOL_OPTIONS: ToolOption[] = [
  { value: "x_search", label: "X Search" },
  { value: "web_search", label: "Web Search" },
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

const AgenticMarketAnalysis = () => {
  // URL and data provider state
  const [url, setUrl] = useState("");
  const [dataProvider, setDataProvider] = useState<DataProvider>("dome");
  
  // Event data state
  const [eventData, setEventData] = useState<{
    eventIdentifier: string;
    pmType: PmType;
    markets: unknown[];
  } | null>(null);
  
  // Agent configurations
  const [agents, setAgents] = useState<AgentConfig[]>([
    { id: generateAgentId(), model: "", tools: undefined, status: 'idle' }
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
  
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  
  // Derived state
  const detectedUrlType = useMemo(() => detectUrlType(url), [url]);
  const showAggregator = agents.length > 1;
  
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
      { id: generateAgentId(), model: "", tools: undefined, status: 'idle' }
    ]);
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
    setAgents(prev => prev.map(a => 
      a.id === agentId ? { 
        ...a, 
        model,
        // Clear tools when switching to OpenAI (tools only work with Grok)
        tools: isOpenAIModel(model) ? undefined : a.tools 
      } : a
    ));
    setOpenDropdown(null);
  };

  const updateAgentTools = (agentId: string, tool: GrokTool) => {
    setAgents(prev => prev.map(a => {
      if (a.id !== agentId) return a;
      
      const currentTool = a.tools?.[0];
      const isSelected = currentTool === tool;
      
      // Toggle: if same tool clicked, deselect; otherwise select the new one
      const newTools: GrokTool[] | undefined = isSelected ? undefined : [tool];
      
      // If selecting a tool and current model is OpenAI or empty, switch to Grok
      let newModel = a.model;
      if (newTools && (isOpenAIModel(a.model) || !a.model)) {
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

    try {
      // Step 1: Fetch event data
      setIsLoadingEvents(true);
      const effectiveDataProvider = detectedUrlType === 'polymarket' ? 'dome' : dataProvider;
      
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
          const agentResponse = await fetch("/api/event-analysis-agent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              markets: eventsData.markets,
              eventIdentifier: eventsData.eventIdentifier,
              pmType: eventsData.pmType,
              model: agent.model,
              tools: agent.tools,
            }),
          });

          const agentData: EventAnalysisAgentResponse = await agentResponse.json();

          if (!agentData.success || !agentData.data) {
            throw new Error(agentData.error || "Agent analysis failed");
          }

          // Update status to completed
          setAgents(prev => prev.map(a => 
            a.id === agent.id ? { ...a, status: 'completed', result: agentData.data } : a
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
          const aggregatorResponse = await fetch("/api/analysis-aggregator-agent", {
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

        } catch (aggError) {
          setAggregator(prev => ({ 
            ...prev, 
            status: 'error', 
            error: aggError instanceof Error ? aggError.message : "Unknown error" 
          }));
        }
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsRunning(false);
      setIsLoadingEvents(false);
    }
  };

  const renderToolsDropdown = (
    agentId: string,
    selectedTools: GrokTool[] | undefined,
    disabled: boolean,
    isOpenAI: boolean,
    zIndex: number
  ) => {
    const dropdownId = `tools-${agentId}`;
    const toolsDisabled = disabled || isOpenAI;
    const hasTools = selectedTools && selectedTools.length > 0;
    
    return (
      <div 
        className="relative" 
        ref={el => { dropdownRefs.current[dropdownId] = el; }}
        style={{ zIndex: openDropdown === dropdownId ? 1000 : zIndex }}
      >
        <button
          type="button"
          onClick={() => !toolsDisabled && setOpenDropdown(openDropdown === dropdownId ? null : dropdownId)}
          disabled={toolsDisabled}
          title={isOpenAI ? "Tools only work with Grok models" : undefined}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs transition-all font-mono whitespace-nowrap ${
            toolsDisabled 
              ? 'bg-secondary/30 border-border/50 text-muted-foreground/50 cursor-not-allowed' 
              : hasTools
              ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-500'
              : 'bg-secondary/50 border-border text-muted-foreground hover:text-foreground hover:border-primary/50'
          }`}
        >
          <Wrench className="w-3 h-3" />
          <span className="hidden sm:inline">
            {hasTools 
              ? (selectedTools[0] === 'x_search' ? 'X Search' : 'Web Search')
              : 'Tools'
            }
          </span>
          <span className="sm:hidden">
            {hasTools ? (selectedTools[0] === 'x_search' ? 'X' : 'Web') : '-'}
          </span>
          <ChevronDown className={`w-3 h-3 transition-transform ${openDropdown === dropdownId ? 'rotate-180' : ''}`} />
        </button>
        
        {openDropdown === dropdownId && (
          <div className="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-lg shadow-xl overflow-hidden" style={{ zIndex: 1000 }}>
            <div className="px-3 py-2 bg-cyan-500/10 border-b border-border">
              <div className="flex items-center gap-2">
                <Wrench className="w-3 h-3 text-cyan-400" />
                <span className="text-xs font-semibold text-cyan-400">Grok Tools</span>
              </div>
            </div>
            <div className="py-1">
              {TOOL_OPTIONS.map((tool) => {
                const isSelected = selectedTools?.includes(tool.value);
                return (
                  <button
                    key={tool.value}
                    type="button"
                    onClick={() => updateAgentTools(agentId, tool.value)}
                    className={`w-full px-4 py-2.5 text-left text-sm font-mono transition-colors flex items-center justify-between ${
                      isSelected
                        ? 'bg-cyan-500/20 text-cyan-400'
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    }`}
                  >
                    <span>{tool.label}</span>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </button>
                );
              })}
            </div>
            <div className="px-3 py-2 border-t border-border bg-secondary/30">
              <p className="text-[10px] text-muted-foreground">
                Tools only work with Grok models
              </p>
            </div>
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
        return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-success" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-destructive" />;
      default:
        return <Bot className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] px-2 py-4 md:px-4 md:py-6">
      <div className="max-w-4xl mx-auto">
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
              href="https://domeapi.io/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border border-border/50 text-xs text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors"
            >
              <Image 
                src="/dome-icon-light.svg" 
                alt="Dome" 
                width={16} 
                height={16} 
                className="w-4 h-4"
              />
              <span>Powered by Dome</span>
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
            
            {/* Data Provider Toggle */}
            {detectedUrlType !== 'none' && (
              <div className="absolute bottom-3 right-4 flex items-center gap-1">
                {detectedUrlType === 'kalshi' ? (
                  <div className="flex items-center bg-secondary/50 rounded-md border border-border/50 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setDataProvider('dome')}
                      disabled={isRunning}
                      className={`px-2 py-0.5 text-[10px] font-mono transition-all ${
                        dataProvider === 'dome'
                          ? 'bg-cyan-500/20 text-cyan-400 border-r border-cyan-500/30'
                          : 'text-muted-foreground hover:text-foreground border-r border-border/50'
                      }`}
                    >
                      Dome
                    </button>
                    <button
                      type="button"
                      onClick={() => setDataProvider('dflow')}
                      disabled={isRunning}
                      className={`px-2 py-0.5 text-[10px] font-mono transition-all ${
                        dataProvider === 'dflow'
                          ? 'bg-violet-500/20 text-violet-400'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      DFlow
                    </button>
                  </div>
                ) : (
                  <span className="px-2 py-0.5 text-[10px] font-mono bg-cyan-500/20 text-cyan-400 rounded-md border border-cyan-500/30">
                    Dome
                  </span>
                )}
              </div>
            )}
            
            {isLoadingEvents && (
              <div className="px-4 pb-3">
                <div className="flex items-center gap-2 text-xs text-primary font-mono">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Fetching market data...</span>
                </div>
              </div>
            )}
          </div>

          {/* Agent Configuration Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm text-muted-foreground">ANALYSIS AGENTS</h3>
              <button
                onClick={addAgent}
                disabled={isRunning}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary/10 border border-primary/30 text-primary text-xs font-display hover:bg-primary/20 hover:border-primary/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-3 h-3" />
                Add Agent
              </button>
            </div>

            {/* Agent Boxes */}
            <div className="space-y-2">
              {agents.map((agent, index) => {
                const isExpanded = expandedAgents.has(agent.id);
                const hasResult = agent.status === 'completed' && agent.result;
                // Higher index agents get lower z-index so dropdowns from earlier agents appear on top
                const agentZIndex = 100 - index;
                
                return (
                  <div 
                    key={agent.id}
                    className={`relative border rounded-lg bg-card/60 backdrop-blur-sm transition-all ${
                      agent.status === 'running' 
                        ? 'border-primary/50 border-glow' 
                        : agent.status === 'completed'
                        ? 'border-success/50'
                        : agent.status === 'error'
                        ? 'border-destructive/50'
                        : 'border-border'
                    }`}
                    style={{ zIndex: agentZIndex }}
                  >
                    <div className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        {renderAgentStatus(agent.status)}
                        <span className="font-display text-sm text-foreground">
                          Agent {index + 1}
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
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-success/10 border border-success/30 text-success text-xs font-display hover:bg-success/20 hover:border-success/50 transition-all"
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
                          agent.tools && agent.tools.length > 0
                        )}
                        {agents.length > 1 && (
                          <button
                            onClick={() => removeAgent(agent.id)}
                            disabled={isRunning}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {/* Expandable Analysis Content */}
                    {hasResult && isExpanded && (
                      <div className="px-4 pb-4 border-t border-border/50 mt-2 pt-4">
                        <AnalysisOutput
                          analysis={agent.result!}
                          timestamp={new Date()}
                        />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Aggregator Box - Only shows when multiple agents */}
              {showAggregator && (
                <div 
                  className={`relative border rounded-lg bg-gradient-to-r from-violet-500/5 to-cyan-500/5 backdrop-blur-sm transition-all ${
                    aggregator.status === 'running' 
                      ? 'border-violet-500/50 shadow-lg shadow-violet-500/10' 
                      : aggregator.status === 'completed'
                      ? 'border-success/50'
                      : aggregator.status === 'error'
                      ? 'border-destructive/50'
                      : 'border-violet-500/30'
                  }`}
                  style={{ zIndex: 10 }}
                >
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      {aggregator.status === 'running' ? (
                        <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
                      ) : aggregator.status === 'completed' ? (
                        <CheckCircle2 className="w-4 h-4 text-success" />
                      ) : aggregator.status === 'error' ? (
                        <XCircle className="w-4 h-4 text-destructive" />
                      ) : (
                        <Layers className="w-4 h-4 text-violet-400" />
                      )}
                      <div className="flex items-center gap-2">
                        <span className="font-display text-sm text-violet-400">
                          Analysis Aggregator
                        </span>
                        <Sparkles className="w-3 h-3 text-violet-400/60" />
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
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-violet-500/10 border border-violet-500/30 text-violet-400 text-xs font-display hover:bg-violet-500/20 hover:border-violet-500/50 transition-all"
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
                    <div className="px-4 pb-4 border-t border-violet-500/30 mt-2 pt-4">
                      <AggregatedAnalysisOutput
                        analysis={aggregator.result}
                        timestamp={new Date()}
                        agentsCount={agents.filter(a => a.status === 'completed').length}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Run Button */}
          <button
            onClick={runAgents}
            disabled={isRunning || !url.trim() || agents.some(a => !a.model) || (agents.length > 1 && !aggregator.model)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary/20 border border-primary/50 text-primary font-display text-sm hover:bg-primary/30 hover:border-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed glow-primary"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Running Agents...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Run Agents
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgenticMarketAnalysis;
