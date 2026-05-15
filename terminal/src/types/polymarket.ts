export type LeaderboardCategory = 
    | 'OVERALL'
    | 'POLITICS'
    | 'SPORTS'
    | 'CRYPTO'
    | 'CULTURE'
    | 'MENTIONS'
    | 'WEATHER'
    | 'ECONOMICS'
    | 'TECH'
    | 'FINANCE';

export type LeaderboardTimePeriod = 'DAY' | 'WEEK' | 'MONTH' | 'ALL';

export type LeaderboardOrderBy = 'PNL' | 'VOL';

export interface TraderLeaderboardEntry {
    rank: string;
    proxyWallet: string;
    userName?: string;
    vol: number;
    pnl: number;
    profileImage?: string;
    xUsername?: string;
    verifiedBadge?: boolean;
}
