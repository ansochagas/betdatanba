import NbaPlayerAnalysisPage from "@/components/nba/NbaPlayerAnalysisPage";

type PageProps = {
  params: {
    matchId: string;
  };
  searchParams: {
    homeTeam?: string;
    awayTeam?: string;
    scheduledAt?: string;
    league?: string;
  };
};

export default function DashboardPlayerAnalysisPage({
  params,
  searchParams,
}: PageProps) {
  return (
    <NbaPlayerAnalysisPage
      matchId={params.matchId}
      homeTeam={searchParams.homeTeam}
      awayTeam={searchParams.awayTeam}
      scheduledAt={searchParams.scheduledAt}
      league={searchParams.league}
    />
  );
}
