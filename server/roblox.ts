import axios from "axios";

const ROBLOX_API_BASE = "https://users.roblox.com/v1";
const ROBLOX_GROUPS_API = "https://groups.roblox.com/v1";
const GROUP_ID = 10260222;

// Minimum rank ID for Supervisor+ (rank 200 and above in Aulani Springs)
const SUPERVISOR_MIN_RANK = 200;

export interface RobloxUserInfo {
  id: number;
  username: string;
  displayName: string;
}

export interface GroupMembershipInfo {
  groupId: number;
  rank: {
    id: number;
    name: string;
  };
}

export async function getUserByUsername(username: string): Promise<RobloxUserInfo | null> {
  try {
    const response = await axios.post(`${ROBLOX_API_BASE}/usernames/users`, {
      usernames: [username],
      excludeBannedUsers: true,
    });

    if (response.data?.data && response.data.data.length > 0) {
      const user = response.data.data[0];
      return {
        id: user.id,
        username: user.name,
        displayName: user.displayName,
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching Roblox user:", error);
    return null;
  }
}

export async function getUserAboutMe(userId: number): Promise<string> {
  try {
    const response = await axios.get(`${ROBLOX_API_BASE}/users/${userId}`);
    return response.data?.description || "";
  } catch (error) {
    console.error("Error fetching user About Me:", error);
    return "";
  }
}

export async function getGroupMembershipForUser(userId: number): Promise<GroupMembershipInfo | null> {
  try {
    const response = await axios.get(`${ROBLOX_GROUPS_API}/users/${userId}/groups/roles`);
    
    console.log(`Fetching groups for user ${userId}...`);
    
    if (response.data?.data) {
      console.log(`User ${userId} is in ${response.data.data.length} groups`);
      
      // Log all groups the user is in for debugging
      response.data.data.forEach((group: any) => {
        console.log(`- Group ${group.group.id}: ${group.group.name}, Rank: ${group.role.rank} (${group.role.name})`);
      });
      
      const membership = response.data.data.find((group: any) => group.group.id === GROUP_ID);
      
      if (membership) {
        console.log(`Found membership in group ${GROUP_ID}`);
        return {
          groupId: membership.group.id,
          rank: {
            id: membership.role.rank,
            name: membership.role.name,
          },
        };
      } else {
        console.log(`User ${userId} is NOT in group ${GROUP_ID}`);
      }
    }
    return null;
  } catch (error) {
    console.error("Error fetching group membership:", error);
    return null;
  }
}

export async function verifyUserCode(username: string, code: string): Promise<boolean> {
  try {
    const user = await getUserByUsername(username);
    if (!user) {
      return false;
    }

    const aboutMe = await getUserAboutMe(user.id);
    return aboutMe.includes(code);
  } catch (error) {
    console.error("Error verifying user code:", error);
    return false;
  }
}

export async function verifyUserRank(userId: number): Promise<{ valid: boolean; rank?: string; rankId?: number }> {
  try {
    const membership = await getGroupMembershipForUser(userId);
    
    if (!membership) {
      console.log(`User ${userId} is not in group ${GROUP_ID}`);
      return { valid: false };
    }

    console.log(`User ${userId} group membership:`, {
      groupId: membership.groupId,
      rank: membership.rank.name,
      rankId: membership.rank.id
    });

    // Verify the group ID matches
    if (membership.groupId !== GROUP_ID) {
      console.log(`User ${userId} is in different group: ${membership.groupId}`);
      return { valid: false };
    }

    // Check if user has Supervisor+ rank (rank ID >= 5)
    const isSupervisorPlus = membership.rank.id >= SUPERVISOR_MIN_RANK;
    
    if (!isSupervisorPlus) {
      console.log(`User ${userId} rank ${membership.rank.id} is below minimum ${SUPERVISOR_MIN_RANK}`);
    }
    
    return {
      valid: isSupervisorPlus,
      rank: membership.rank.name,
      rankId: membership.rank.id,
    };
  } catch (error) {
    console.error("Error verifying user rank:", error);
    return { valid: false };
  }
}

// Map rank IDs to standardized rank names based on Aulani Springs structure
export function mapRankIdToName(rankId: number): string {
  if (rankId >= 255) return "Proprietor";
  if (rankId >= 254) return "Executive Board";
  if (rankId >= 253) return "Board of Directors";
  if (rankId >= 252) return "Chief Staff Officer";
  if (rankId >= 240) return "Marketing Department";
  if (rankId >= 235) return "Chief Administrative Officer";
  if (rankId >= 225) return "Public Relations Officer";
  if (rankId >= 222) return "Senior Management";
  if (rankId >= 220) return "General Manager";
  if (rankId >= 205) return "Assistant Manager";
  if (rankId >= 200) return "Supervisor";
  return "Staff";
}
