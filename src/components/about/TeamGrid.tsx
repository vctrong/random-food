import Image from "next/image";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ABOUT_TEAM } from "@/constants/about";
import type { AboutTeamMember } from "@/constants/about";

const ROLE_TONES: Record<AboutTeamMember["tone"], string> = {
  primary: "bg-primary-soft text-primary-strong dark:text-primary",
  accent: "bg-accent-soft text-accent-ink",
};

export function TeamGrid() {
  return (
    <section aria-labelledby="team-title" className="mx-auto w-full max-w-6xl px-4 py-16 md:px-6 md:py-20 lg:px-8">
      <Reveal>
        <SectionHeading
          id="team-title"
          align="center"
          tone="pink"
          eyebrow="Đội ngũ"
          title="Những người đứng sau NayAnGi"
          description="Nhóm nhỏ đứng sau từng dòng code và từng màn hình của NayAnGi."
        />
      </Reveal>

      <ul className="mx-auto mt-10 grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-2">
        {ABOUT_TEAM.map((member, index) => (
          <Reveal as="li" key={member.name} delay={index * 0.08}>
            <article className="group h-full rounded-3xl border border-border bg-surface p-3 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
              <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-primary-soft">
                <Image
                  src={member.image}
                  alt={`Ảnh chân dung ${member.name}`}
                  fill
                  sizes="(min-width: 640px) 360px, 90vw"
                  className="object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105"
                />
              </div>
              <div className="px-2 pt-4 pb-2 text-center">
                <h3 className="text-h3 text-text-primary">{member.name}</h3>
                <span
                  className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-bold ${ROLE_TONES[member.tone]}`}
                >
                  {member.role}
                </span>
              </div>
            </article>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}
