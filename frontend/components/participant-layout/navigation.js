export const participantRoutes = [
  { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { href: '/find-a-team', label: 'Find a team', icon: 'people' },
  { href: '/my-team', label: 'My team', icon: 'group' },
  { href: '/event-logistics', label: 'Event logistics', icon: 'calendar' },
  { href: '/participant-guide', label: 'Participant guide', icon: 'help' },
];

export function getParticipantRoute(pathname) {
  return participantRoutes.find(
    ({ href }) => pathname === href || pathname.startsWith(`${href}/`),
  );
}
