import {
  FiBriefcase,
  FiExternalLink,
  FiMail,
  FiLinkedin,
} from "react-icons/fi";
import { DetailContentCard, DetailItem } from "@/components/details/detail-content-card";

interface OutreachDetailsCardProps {
  roleTargeted: string;
  companyLink?: string | null;
  contactMethod?: string | null;
  emailAddress?: string | null;
  linkedinProfileUrl?: string | null;
  emailThreadUrl?: string | null;
  editable?: boolean;
  onSave?: (data: Record<string, string>) => Promise<void>;
}

export function OutreachDetailsCard({
  roleTargeted,
  companyLink,
  contactMethod,
  emailAddress,
  linkedinProfileUrl,
  emailThreadUrl,
  editable,
  onSave,
}: OutreachDetailsCardProps) {
  // Derived, zero-storage deep link: opens a Gmail search scoped to this
  // contact's address (account-agnostic, no `/u/0` so Gmail picks the active
  // account). encodeURIComponent turns "@" into %40 etc. automatically.
  const gmailSearchUrl = emailAddress
    ? `https://mail.google.com/mail/#search/${encodeURIComponent(emailAddress)}`
    : null;
  const detailItems: DetailItem[] = [
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
      copyValue: companyLink || undefined,
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
      copyValue: emailAddress || undefined,
      inputType: "text",
    },
    {
      id: "linkedin",
      label: "LinkedIn Profile",
      value: linkedinProfileUrl ? "View LinkedIn Profile" : "-",
      icon: <FiLinkedin className="w-3.5 h-3.5" />,
      isLink: !!linkedinProfileUrl,
      href: linkedinProfileUrl || undefined,
      copyValue: linkedinProfileUrl || undefined,
      inputType: "text",
    },
    {
      id: "emailThreadUrl",
      label: "Email Thread",
      // Empty value (not "-") so the edit input prefills blank, not a dash.
      value: emailThreadUrl ? "Open saved thread" : "",
      icon: <FiExternalLink className="w-3.5 h-3.5" />,
      isLink: !!emailThreadUrl,
      href: emailThreadUrl || undefined,
      copyValue: emailThreadUrl || "",
      inputType: "text",
      fullWidth: true,
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

  return <DetailContentCard items={detailItems} editable={editable} onSave={onSave} action={gmailAction} />;
}