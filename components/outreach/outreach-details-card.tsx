"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FiBriefcase,
  FiExternalLink,
  FiMail,
  FiLinkedin,
  FiCopy,
  FiCheck,
} from "react-icons/fi";
import { CopyButton } from "../copy-button";

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
  const [emailCopied, setEmailCopied] = useState(false);
  const [linkedinCopied, setLinkedinCopied] = useState(false);

  const copyToClipboard = async (
    value: string,
    setCopied: (v: boolean) => void
  ) => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Card className="border-2 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl font-extrabold">
          <div className="w-1.5 h-6 rounded-full bg-primary" />
          Details
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Target Role */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <FiBriefcase className="w-3.5 h-3.5" />
              Target Role
            </label>
            <p className="font-bold text-lg">{roleTargeted}</p>
          </div>

          {/* Company Website */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <FiExternalLink className="w-3.5 h-3.5" />
              Website
            </label>

            {companyLink ? (
              <a
                href={companyLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-bold transition-all group"
              >
                Visit Page
                <FiExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </a>
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </div>

          {/* Contact Method */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              {contactMethod === "EMAIL" ? (
                <FiMail className="w-3.5 h-3.5" />
              ) : (
                <FiLinkedin className="w-3.5 h-3.5" />
              )}
              Contact Method
            </label>
            <div className="font-bold">{contactMethod}</div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <FiMail className="w-3.5 h-3.5" />
              Email
            </label>

            <div className="flex items-center gap-2 font-bold">
              <p className="truncate">{emailAddress || "-"}</p>

              {emailAddress && (
                <CopyButton
                  copied={emailCopied}
                  onClick={() =>
                    copyToClipboard(emailAddress, setEmailCopied)
                  }
                />
              )}
            </div>
          </div>

          {/* LinkedIn */}
          {linkedinProfileUrl && (
            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <FiLinkedin className="w-3.5 h-3.5" />
                LinkedIn Profile
              </label>

              <div className="flex items-center gap-3 font-bold">
                <a
                  href={linkedinProfileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
                >
                  View LinkedIn Profile
                  <FiExternalLink className="w-4 h-4" />
                </a>

                <CopyButton
                  copied={linkedinCopied}
                  onClick={() =>
                    copyToClipboard(
                      linkedinProfileUrl,
                      setLinkedinCopied
                    )
                  }
                />
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}