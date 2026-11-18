/**
 * Profile picture: a coloured square with a simple drawn face (slice 09).
 *
 * Inline SVG from the fixed set in lib/profiles.ts, so there are no image
 * files, no uploads and no copyrighted artwork. Decorative: the surrounding
 * button or link names the profile.
 */
import { avatarById } from '../../lib/profiles.ts';
import './ProfileAvatar.css';

interface ProfileAvatarProps {
  avatar: string;
  /** Rendered width and height in pixels. */
  size?: number;
  className?: string;
}

export function ProfileAvatar({ avatar, size = 32, className }: ProfileAvatarProps) {
  const { color, face } = avatarById(avatar);
  return (
    <svg
      className={`profile-avatar${className ? ` ${className}` : ''}`}
      viewBox="0 0 40 40"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
    >
      <rect width="40" height="40" rx="4" fill={color} />
      <g fill="#fff">
        {face === 'wink' ? (
          <rect x="10" y="15" width="7" height="2.5" rx="1.25" />
        ) : (
          <circle cx="13.5" cy="15.5" r="2.5" />
        )}
        <circle cx="26.5" cy="15.5" r="2.5" />
      </g>
      {face === 'grin' ? (
        <path d="M11 24h18a9 9 0 0 1-18 0Z" fill="#fff" />
      ) : (
        <path
          d="M12 24.5q8 7 16 0"
          fill="none"
          stroke="#fff"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}
