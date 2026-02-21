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
  contactMethod: string;
  emailAddress?: string | null;
  linkedinProfileUrl?: string | null;
}

export function OutreachDetailsCard({
  roleTargeted,
  companyLink,
  contactMethod,
  emailAddress,
  linkedinProfileUrl,
}: OutreachDetailsCardProps) {
  const detailItems: DetailItem[] = [
    {
      label: "Target Role",
      value: roleTargeted,
      icon: <FiBriefcase className="w-3.5 h-3.5" />,
      copyValue: roleTargeted,
    },
    {
      label: "Website",
      value: companyLink ? "Visit Page" : "-",
      icon: <FiExternalLink className="w-3.5 h-3.5" />,
      isLink: !!companyLink,
      href: companyLink || undefined,
      copyValue: companyLink || undefined,
    },
    {
      label: "Contact Method",
      value: contactMethod,
      icon: contactMethod === "EMAIL" ? <FiMail className="w-3.5 h-3.5" /> : <FiLinkedin className="w-3.5 h-3.5" />,
    },
    {
      label: "Email",
      value: emailAddress || "-",
      icon: <FiMail className="w-3.5 h-3.5" />,
      copyValue: emailAddress || undefined,
    },
  ];

  if (linkedinProfileUrl) {
    detailItems.push({
      label: "LinkedIn Profile",
      value: "View LinkedIn Profile",
      icon: <FiLinkedin className="w-3.5 h-3.5" />,
      isLink: true,
      href: linkedinProfileUrl,
      copyValue: linkedinProfileUrl,
      fullWidth: true,
    });
  }

  return <DetailContentCard items={detailItems} />;
}