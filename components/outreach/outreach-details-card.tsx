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
  editable?: boolean;
  onSave?: (data: Record<string, string>) => Promise<void>;
}

export function OutreachDetailsCard({
  roleTargeted,
  companyLink,
  contactMethod,
  emailAddress,
  linkedinProfileUrl,
  editable,
  onSave,
}: OutreachDetailsCardProps) {
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
  ];

  return <DetailContentCard items={detailItems} editable={editable} onSave={onSave} />;
}