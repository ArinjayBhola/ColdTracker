import { Sidebar } from "@/components/sidebar";
import { getStartupByIdAction } from "@/actions/startups";
import { notFound } from "next/navigation";
import { FiArrowLeft, FiGlobe, FiMapPin, FiUsers, FiDollarSign, FiBriefcase, FiLinkedin, FiCheckCircle } from "react-icons/fi";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OutreachToggle } from "@/components/outreach-toggle";
import { DeleteStartupButton } from "@/components/delete-startup-button";
import { StartupFormDialog } from "@/components/startup-form-dialog";


export default async function StartupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const startup = await getStartupByIdAction(id);

  if (!startup) {
    notFound();
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-5xl mx-auto space-y-8 pt-16 md:pt-0 pb-12">
          {/* Back Button */}
          <Link href="/startups" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors font-medium group">
            <FiArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Startups
          </Link>

          {/* Header Card */}
          <Card className="border-border/50 shadow-sm rounded-3xl overflow-hidden bg-card">
            <CardContent className="space-y-5 p-5 sm:p-8 md:p-10">
              <div className="flex min-w-0 flex-wrap items-center gap-x-6 gap-y-4">
                <div className="flex min-w-0 flex-[1_1_22em] items-center gap-4">
                  <Avatar className="h-16 w-16 shrink-0 rounded-2xl border border-border/60 shadow-sm sm:h-20 sm:w-20">
                    <AvatarImage src={startup.logoUrl || ""} alt={startup.name} className="object-cover" />
                    <AvatarFallback className="rounded-2xl bg-primary/5 text-2xl font-bold text-primary">
                      {startup.name.substring(0,2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-2">
                    <h1 className="min-w-0 max-w-full text-2xl font-extrabold leading-[normal] tracking-tight [overflow-wrap:anywhere] sm:text-3xl">
                      {startup.name}
                    </h1>
                    <Badge variant="success" className="w-fit shrink-0 whitespace-nowrap gap-1.5 px-2.5 py-1 text-xs font-semibold leading-normal">
                      <FiCheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
                      Verified
                    </Badge>
                  </div>
                </div>
                <div role="group" aria-label="Startup actions" className="flex max-w-full flex-wrap items-center gap-2 sm:ml-auto">
                  <OutreachToggle startupId={startup.id} initialStatus={startup.tracking?.[0]?.outreachDone || false} compact
                    className="h-auto min-h-10 gap-2 rounded-xl px-3 py-2 leading-normal shadow-none" />
                  <div className="flex shrink-0 items-center gap-1 rounded-xl border border-border/70 bg-muted/20 p-1">
                    <StartupFormDialog startupId={startup.id} startupName={startup.name} compact
                      className="h-8 w-8 shrink-0 rounded-lg border-0 bg-transparent text-muted-foreground shadow-none hover:text-foreground" />
                    {startup.website && (
                      <Button variant="ghost" size="icon" asChild className="h-8 w-8 shrink-0 rounded-lg text-muted-foreground hover:text-foreground">
                        <a href={startup.website} target="_blank" rel="noopener noreferrer" aria-label="Visit startup website">
                          <FiGlobe className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    <DeleteStartupButton startupId={startup.id} startupName={startup.name} redirectTo="/startups"
                      className="h-8 w-8 shrink-0 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive" />
                  </div>
                </div>
              </div>
              <div className="space-y-4 sm:pl-24">
                <p className="max-w-3xl text-base leading-relaxed text-muted-foreground [overflow-wrap:anywhere] sm:text-lg">
                  {startup.description || "No detailed description available for this startup yet."}
                </p>
                <div className="flex flex-wrap gap-2">
                  {startup.sector && <Badge variant="secondary" className="max-w-full rounded-lg border-none bg-muted/50 px-3 py-1 text-xs font-medium">{startup.sector}</Badge>}
                  {startup.isTrending && <Badge variant="secondary" className="rounded-lg border-none bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-600">Trending</Badge>}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2 border-border/50 shadow-sm rounded-3xl bg-card overflow-hidden">
              <CardHeader className="px-8 pt-8 pb-4 border-b border-border/30">
                <CardTitle className="text-xl font-bold flex items-center gap-3">
                  <FiBriefcase className="w-5 h-5 text-primary" />
                  Company Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                  <div className="space-y-2">
                    <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest flex items-center gap-2">
                      <FiGlobe className="w-3 h-3" /> Sector
                    </div>
                    <div className="font-bold text-base">{startup.sector || "N/A"}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest flex items-center gap-2">
                      <FiMapPin className="w-3 h-3" /> Location
                    </div>
                    <div className="font-bold text-base truncate" title={startup.location || "N/A"}>
                      {startup.location || "N/A"}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest flex items-center gap-2">
                      <FiUsers className="w-3 h-3" /> Team Size
                    </div>
                    <div className="font-bold text-base">{startup.teamSize || "N/A"}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 shadow-sm rounded-3xl bg-card overflow-hidden">
              <CardHeader className="px-8 pt-8 pb-4 border-b border-border/30">
                <CardTitle className="text-xl font-bold flex items-center gap-3">
                  <FiDollarSign className="w-5 h-5 text-emerald-500" />
                  Funding Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Stage</div>
                    <div className="font-bold text-base">{startup.fundingRound || "Undisclosed"}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Amount</div>
                    <div className="font-extrabold text-2xl text-primary">{startup.fundingAmount || "Undisclosed"}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Team Members */}
          <Card className="border-border/50 shadow-sm rounded-3xl bg-card overflow-hidden">
            <CardHeader className="px-8 pt-8 pb-4 border-b border-border/30 flex flex-row items-center justify-between">
              <CardTitle className="text-xl font-bold flex items-center gap-3">
                <FiUsers className="w-5 h-5 text-primary" />
                Team Members ({startup.employees.length})
              </CardTitle>
              <Button variant="outline" size="sm" className="rounded-xl h-9 px-4 font-bold text-xs border-2 hover:bg-primary/5 hover:text-primary transition-all" asChild>
                <Link href={`/outreach/new?company=${encodeURIComponent(startup.name)}`}>
                  Send to all
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-muted/30 border-b border-border/30">
                    <tr>
                      <th className="px-8 py-4 text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Name</th>
                      <th className="px-8 py-4 text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Role</th>
                      <th className="px-8 py-4 text-[10px] uppercase font-bold text-muted-foreground tracking-widest text-center">Socials</th>
                      <th className="px-8 py-4 text-[10px] uppercase font-bold text-muted-foreground tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {startup.employees.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-8 py-12 text-center text-muted-foreground italic">
                          No team members listed.
                        </td>
                      </tr>
                    ) : (
                      startup.employees.map((emp) => (
                        <tr key={emp.id} className="hover:bg-muted/20 transition-colors group">
                          <td className="px-8 py-5 font-bold group-hover:text-primary transition-colors">{emp.name}</td>
                          <td className="px-8 py-5 text-sm text-muted-foreground font-medium">{emp.role || "-"}</td>
                          <td className="px-8 py-5">
                            <div className="flex items-center justify-center gap-3">
                              {emp.linkedinUrl ? (
                                <a href={emp.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 transition-colors p-2 hover:bg-blue-500/10 rounded-xl">
                                  <FiLinkedin className="w-5 h-5" />
                                </a>
                              ) : "-"}
                            </div>
                          </td>
                          <td className="px-8 py-5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="outline" size="sm" className="rounded-xl h-9 px-4 font-bold text-xs border-2 hover:bg-primary/5 hover:text-primary transition-all" asChild>
                                <Link href={`/outreach/new?company=${encodeURIComponent(startup.name)}&contact=${encodeURIComponent(emp.name)}&method=LINKEDIN`}>
                                  Cold DM
                                </Link>
                              </Button>
                              {emp.email ? (
                                <Button variant="outline" size="sm" className="rounded-xl h-9 px-4 font-bold text-xs border-2 hover:bg-primary/5 hover:text-primary transition-all" asChild>
                                  <a href={`mailto:${emp.email}`}>Send Email</a>
                                </Button>
                              ) : (
                                <Button variant="outline" size="sm" disabled className="rounded-xl h-9 px-4 font-bold text-xs">
                                  No Email
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
