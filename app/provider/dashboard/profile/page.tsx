import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Typography } from "@/components/ui/typography";

export default async function ProviderProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: provider } = await supabase
    .from("catering_providers")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!provider) {
    return <Typography>No provider profile found.</Typography>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Business Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            {provider.logo_url && (
              <Image
                src={provider.logo_url}
                alt="Logo"
                width={80}
                height={80}
                className="rounded"
              />
            )}
            <div>
              <Typography variant="h4">{provider.business_name}</Typography>
              {provider.business_address && (
                <Typography variant="mutedText">
                  {provider.business_address}
                </Typography>
              )}
            </div>
          </div>
          <Typography>{provider.description}</Typography>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Services</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {provider.service_areas && provider.service_areas.length > 0 && (
            <Typography>
              <span className="font-medium">Service Areas:</span>{" "}
              {provider.service_areas.join(", ")}
            </Typography>
          )}
          {provider.sample_menu_url && (
            <Typography>
              <a
                href={provider.sample_menu_url}
                className="text-primary hover:underline"
              >
                View Sample Menu
              </a>
            </Typography>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Typography variant="smallText">
            <span className="font-medium">Contact:</span> {provider.contact_person_name}
          </Typography>
          <Typography variant="smallText">
            <span className="font-medium">Phone:</span> {provider.mobile_number}
          </Typography>
          {provider.social_media_links &&
            Object.keys(provider.social_media_links).length > 0 && (
              <div className="space-y-1">
                <Typography variant="smallText" className="font-medium">
                  Social:
                </Typography>
                <ul className="list-disc list-inside text-sm">
                  {Object.entries(provider.social_media_links).map(([platform, url]) => (
                    <li key={platform}>
                      <a href={url as string} className="text-primary hover:underline">
                        {platform}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
