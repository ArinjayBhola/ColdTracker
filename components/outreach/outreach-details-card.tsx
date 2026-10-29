"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  FiBriefcase,
  FiExternalLink,
  FiMail,
  FiLinkedin,
  FiUser,
  FiCopy,
  FiCheck,
} from "react-icons/fi";
import { DetailContentCard, DetailItem } from "@/components/details/detail-content-card";
import { APPLICATION_SOURCES, APPLICATION_STATUSES } from "@/lib/validations";
import { displayDate } from "@/lib/display-date";

interface OutreachDetailsCardProps {
  companyName: string;
  personName?: string;
  personRole?: string;
  roleTargeted: string;
  companyLink?: string | null;
  contactMethod?: string | null;
  emailAddress?: string | null;
  linkedinProfileUrl?: string | null;
  emailThreadUrl?: string | null;
  applicationSource?: string;
  applicationStatus?: string;
  applicationUrl?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  editable?: boolean;
  onSave?: (data: Record<string, string>) => Promise<void>;
}

export function OutreachDetailsCard({
  companyName,
  personName,
  personRole,
  roleTargeted,
  companyLink,
  contactMethod,
  emailAddress,
  linkedinProfileUrl,
  emailThreadUrl,
  applicationSource = "DIRECT_EMAIL",
  applicationStatus = "SENT",
  applicationUrl,
  createdAt,
  updatedAt,
  editable,
  onSave,
}: OutreachDetailsCardProps) {
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const { toast } = useToast();
  const copyText = [
    ["Company name", companyName],
    ["Website", companyLink],
    ["Target role", roleTargeted],
    ["Contact name", personName],
    ["Contact position", personRole],
    ["Contact method", contactMethod],
    ["Email", emailAddress],
    ["LinkedIn profile", linkedinProfileUrl],
    ["Application source", applicationSource],
    ["Application status", applicationStatus],
    ["Application link", applicationUrl],
    ["Email thread", emailThreadUrl],
  ].map(([label, value]) => `${label}: ${value?.trim() || "Not provided"}`).join("\n");
  const copied = copiedText === copyText;
  const copyDetails = async () => {
    try {
      await navigator.clipboard.writeText(copyText);
      setCopiedText(copyText);
      toast({ title: "Outreach details copied" });
    } catch {
      setCopiedText(null);
      toast({ title: "Could not copy details", description: "Please allow clipboard access and try again.", variant: "destructive" });
    }
  };
  // Derived, zero-storage deep link: opens a Gmail search scoped to this
  // contact's address (account-agnostic, no `/u/0` so Gmail picks the active
  // account). encodeURIComponent turns "@" into %40 etc. automatically.
  const gmailSearchUrl = emailAddress
    ? `https://mail.google.com/mail/#search/${encodeURIComponent(emailAddress)}`
    : null;
  const detailItems: DetailItem[] = [
    { id: "companyName", label: "Company name", value: companyName, copyValue: companyName, inputType: "text", required: true, icon: <FiBriefcase className="h-3.5 w-3.5" /> },
    { id: "personName", label: "Contact name", value: personName || "", copyValue: personName || "", inputType: "text", icon: <FiUser className="h-3.5 w-3.5" /> },
    { id: "personRole", label: "Contact position", value: personRole || "", copyValue: personRole || "", inputType: "text", required: true, icon: <FiBriefcase className="h-3.5 w-3.5" /> },
    {
      id: "roleTargeted",
      label: "Target Role",
      value: roleTargeted,
      icon: <FiBriefcase className="w-3.5 h-3.5" />,
      copyValue: roleTargeted,
      inputType: "text",
      required: true,
    },
    {
      id: "companyLink",
      label: "Website",
      value: companyLink ? "Visit Page" : "-",
      icon: <FiExternalLink className="w-3.5 h-3.5" />,
      isLink: !!companyLink,
      href: companyLink || undefined,
      copyValue: companyLink || "",
      inputType: "text",
    },
    {
      id: "contactMethod",
      label: "Contact Method",
      value: contactMethod || "-",
      icon: contactMethod === "LINKEDIN" ? <FiLinkedin className="w-3.5 h-3.5" /> : <FiMail className="w-3.5 h-3.5" />,
      copyValue: contactMethod || undefined,
      inputType: "select",
      options: [
        { label: "Email", value: "EMAIL" },
        { label: "LinkedIn", value: "LINKEDIN" },
      ],
      required: true,
    },
    {
      id: "email",
      label: "Email",
      value: emailAddress || "-",
      icon: <FiMail className="w-3.5 h-3.5" />,
      copyValue: emailAddress || "",
      inputType: "text",
    },
    {
      id: "linkedin",
      label: "LinkedIn Profile",
      value: linkedinProfileUrl ? "View LinkedIn Profile" : "-",
      icon: <FiLinkedin className="w-3.5 h-3.5" />,
      isLink: !!linkedinProfileUrl,
      href: linkedinProfileUrl || undefined,
      copyValue: linkedinProfileUrl || "",
      inputType: "text",
    },
  ];

  const gmailAction = gmailSearchUrl ? (
    <a
      href={gmailSearchUrl}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 h-7 rounded-full px-3 text-[10px] font-bold border border-border/80 text-primary hover:bg-muted transition-colors"
    >
      <FiMail className="w-3 h-3" />
      Open in Gmail
    </a>
  ) : undefined;

  const fieldOrder = ["companyName", "roleTargeted", "companyLink", "personName", "personRole", "contactMethod", "email", "linkedin"];
  const orderedItems = fieldOrder.flatMap(id => {
    const item = detailItems.find(item => item.id === id);
    return item ? [{ ...item, fullWidth: id === "companyLink" }] : [];
  });

  const label = (value: string) => value.toLowerCase().replaceAll("_", " ").replace(/^./, character => character.toUpperCase());
  const moreItems: DetailItem[] = [
    { id: "applicationSource", label: "Application source", value: label(applicationSource), copyValue: applicationSource, inputType: "select", options: APPLICATION_SOURCES.map(value => ({ value, label: label(value) })) },
    { id: "applicationStatus", label: "Application status", value: label(applicationStatus), copyValue: applicationStatus, inputType: "select", options: APPLICATION_STATUSES.map(value => ({ value, label: label(value) })) },
    { id: "applicationUrl", label: "Application link", value: applicationUrl ? "Open application" : "Not added", copyValue: applicationUrl || "", isLink: !!applicationUrl, href: applicationUrl || undefined, inputType: "text", fullWidth: true, icon: <FiExternalLink className="h-3.5 w-3.5" /> },
    { id: "emailThreadUrl", label: "Email thread", value: emailThreadUrl ? "Open conversation" : "Not added", copyValue: emailThreadUrl || "", isLink: !!emailThreadUrl, href: emailThreadUrl || undefined, inputType: "text", fullWidth: true, icon: <FiMail className="h-3.5 w-3.5" /> },
    ...(createdAt ? [{ id: "createdAt", label: "Created", value: displayDate(createdAt), readOnly: true }] : []),
    ...(updatedAt ? [{ id: "updatedAt", label: "Updated", value: displayDate(updatedAt), readOnly: true }] : []),
  ];

  return <DetailContentCard items={orderedItems} moreItems={moreItems} editable={editable} onSave={onSave} action={
    <div className="flex flex-wrap items-center justify-end gap-2">
      {gmailAction}
      <Button type="button" variant="outline" size="sm" onClick={copyDetails} aria-label="Copy all outreach details" className="h-7 rounded-full px-3 text-[10px] font-bold border-border/80">
        {copied ? <FiCheck className="h-3 w-3" /> : <FiCopy className="h-3 w-3" />}
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  } />;
}
