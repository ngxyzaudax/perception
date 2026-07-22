import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { perceptionHome } from "../services/sessions/sessionPaths.js";

export type TeamMember = {
  name: string;
  agentId: string;
};

export type Team = {
  name: string;
  description: string;
  members: TeamMember[];
};

const teamsRoot = (): string => join(perceptionHome(), "teams");

const teamConfigPath = (name: string): string =>
  join(teamsRoot(), name, "config.json");

export const createTeam = async (name: string, description: string): Promise<Team> => {
  const team: Team = { name, description, members: [] };
  await mkdir(join(teamsRoot(), name), { recursive: true });
  await writeFile(teamConfigPath(name), JSON.stringify(team, null, 2), "utf8");
  return team;
};

export const deleteTeam = async (name: string): Promise<boolean> => {
  try {
    const { rm } = await import("node:fs/promises");
    await rm(join(teamsRoot(), name), { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
};

export const loadTeam = async (name: string): Promise<Team | null> => {
  try {
    const raw = await readFile(teamConfigPath(name), "utf8");
    return JSON.parse(raw) as Team;
  } catch {
    return null;
  }
};

export const addTeamMember = async (
  teamName: string,
  memberName: string,
  agentId: string,
): Promise<Team | null> => {
  const team = await loadTeam(teamName);
  if (!team) {
    return null;
  }
  const filtered = team.members.filter((member) => member.name !== memberName);
  const next: Team = {
    ...team,
    members: [...filtered, { name: memberName, agentId }],
  };
  await writeFile(teamConfigPath(teamName), JSON.stringify(next, null, 2), "utf8");
  return next;
};

export const listTeams = async (): Promise<Team[]> => {
  try {
    const { readdir } = await import("node:fs/promises");
    const entries = await readdir(teamsRoot(), { withFileTypes: true });
    const teams = await Promise.all(
      entries.filter((entry) => entry.isDirectory()).map((entry) => loadTeam(entry.name)),
    );
    return teams.filter((team): team is Team => team !== null);
  } catch {
    return [];
  }
};

export const formatTeamList = async (): Promise<string> => {
  const teams = await listTeams();
  if (teams.length === 0) {
    return "no teams configured";
  }
  return teams
    .map(
      (team) =>
        `${team.name}: ${team.description} (${team.members.length} members)`,
    )
    .join("\n");
};
