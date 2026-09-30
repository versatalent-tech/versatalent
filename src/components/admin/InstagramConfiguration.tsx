"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Settings } from "lucide-react";
import {
  ARTIST_INSTAGRAM_ACCOUNTS,
  InstagramService,
} from "@/lib/services/instagram-service";

type InstagramConfigurationProps = {
  onUpdate?: () => void;
};

/**
 * Read-only view of each artist's Instagram configuration.
 *
 * Featured post URLs are defined in code (ARTIST_INSTAGRAM_ACCOUNTS in
 * src/lib/services/instagram-service.ts); there is no persistent storage
 * for editing them from the admin yet.
 */
export function InstagramConfiguration({ onUpdate }: InstagramConfigurationProps) {
  const status = InstagramService.getConfigurationStatus();

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Artist Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600">
          Featured post URLs are set in{" "}
          <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
            src/lib/services/instagram-service.ts
          </code>{" "}
          (<code className="text-xs">featured_posts</code> for each artist). Changes there go
          live on the next deploy.
        </p>

        <ul className="divide-y divide-gray-200 border border-gray-200 rounded-lg">
          {Object.entries(ARTIST_INSTAGRAM_ACCOUNTS).map(([artistKey, config]) => {
            const artistStatus = status[artistKey];
            return (
              <li key={artistKey} className="flex items-center justify-between gap-4 p-4">
                <div>
                  <p className="font-medium text-foreground">{config.display_name}</p>
                  <a
                    href={config.instagram_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-500 hover:text-gold"
                  >
                    @{config.username}
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">
                    {artistStatus.validUrls} valid post{artistStatus.validUrls === 1 ? "" : "s"}
                  </span>
                  <Badge variant={artistStatus.configured ? "default" : "secondary"}>
                    {artistStatus.configured ? "Configured" : "Not configured"}
                  </Badge>
                </div>
              </li>
            );
          })}
        </ul>

        {onUpdate && (
          <Button variant="outline" size="sm" onClick={onUpdate}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh feed
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
