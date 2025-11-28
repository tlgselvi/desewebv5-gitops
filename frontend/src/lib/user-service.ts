/**
 * User Service
 * Provides user management functionality with mock data
 */

import { UserDto } from "./dtos/user.dto";

/**
 * Mock users data - 20 realistic users
 */
const mockUsers: UserDto[] = [
  {
    id: "1",
    name: "Ahmet Yılmaz",
    email: "ahmet.yilmaz@dese.ai",
    role: "Admin",
    status: "Active",
    lastLogin: "2024-01-15T10:30:00Z",
  },
  {
    id: "2",
    name: "Ayşe Demir",
    email: "ayse.demir@dese.ai",
    role: "User",
    status: "Active",
    lastLogin: "2024-01-15T09:15:00Z",
  },
  {
    id: "3",
    name: "Mehmet Kaya",
    email: "mehmet.kaya@dese.ai",
    role: "User",
    status: "Active",
    lastLogin: "2024-01-14T16:45:00Z",
  },
  {
    id: "4",
    name: "Fatma Şahin",
    email: "fatma.sahin@dese.ai",
    role: "Admin",
    status: "Active",
    lastLogin: "2024-01-15T11:20:00Z",
  },
  {
    id: "5",
    name: "Ali Çelik",
    email: "ali.celik@dese.ai",
    role: "User",
    status: "Passive",
    lastLogin: "2024-01-10T14:30:00Z",
  },
  {
    id: "6",
    name: "Zeynep Arslan",
    email: "zeynep.arslan@dese.ai",
    role: "User",
    status: "Active",
    lastLogin: "2024-01-15T08:00:00Z",
  },
  {
    id: "7",
    name: "Mustafa Öztürk",
    email: "mustafa.ozturk@dese.ai",
    role: "User",
    status: "Active",
    lastLogin: "2024-01-14T18:20:00Z",
  },
  {
    id: "8",
    name: "Elif Yıldız",
    email: "elif.yildiz@dese.ai",
    role: "Admin",
    status: "Active",
    lastLogin: "2024-01-15T12:10:00Z",
  },
  {
    id: "9",
    name: "Can Aydın",
    email: "can.aydin@dese.ai",
    role: "User",
    status: "Passive",
    lastLogin: "2024-01-08T10:00:00Z",
  },
  {
    id: "10",
    name: "Selin Kara",
    email: "selin.kara@dese.ai",
    role: "User",
    status: "Active",
    lastLogin: "2024-01-15T07:30:00Z",
  },
  {
    id: "11",
    name: "Burak Şimşek",
    email: "burak.simsek@dese.ai",
    role: "User",
    status: "Active",
    lastLogin: "2024-01-14T15:45:00Z",
  },
  {
    id: "12",
    name: "Deniz Koç",
    email: "deniz.koc@dese.ai",
    role: "User",
    status: "Active",
    lastLogin: "2024-01-15T09:50:00Z",
  },
  {
    id: "13",
    name: "Gizem Polat",
    email: "gizem.polat@dese.ai",
    role: "Admin",
    status: "Active",
    lastLogin: "2024-01-15T11:45:00Z",
  },
  {
    id: "14",
    name: "Emre Doğan",
    email: "emre.dogan@dese.ai",
    role: "User",
    status: "Passive",
    lastLogin: "2024-01-05T13:20:00Z",
  },
  {
    id: "15",
    name: "Burcu Yıldırım",
    email: "burcu.yildirim@dese.ai",
    role: "User",
    status: "Active",
    lastLogin: "2024-01-15T10:15:00Z",
  },
  {
    id: "16",
    name: "Kemal Avcı",
    email: "kemal.avci@dese.ai",
    role: "User",
    status: "Active",
    lastLogin: "2024-01-14T17:30:00Z",
  },
  {
    id: "17",
    name: "Seda Özdemir",
    email: "seda.ozdemir@dese.ai",
    role: "User",
    status: "Active",
    lastLogin: "2024-01-15T08:45:00Z",
  },
  {
    id: "18",
    name: "Tolga Güneş",
    email: "tolga.gunes@dese.ai",
    role: "Admin",
    status: "Active",
    lastLogin: "2024-01-15T12:30:00Z",
  },
  {
    id: "19",
    name: "Nazlı Çınar",
    email: "nazli.cinar@dese.ai",
    role: "User",
    status: "Passive",
    lastLogin: "2024-01-03T11:00:00Z",
  },
  {
    id: "20",
    name: "Onur Bulut",
    email: "onur.bulut@dese.ai",
    role: "User",
    status: "Active",
    lastLogin: "2024-01-15T09:00:00Z",
  },
];

/**
 * Get all users
 * In production, this would make an API call
 */
export async function getUsers(): Promise<UserDto[]> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 300));
  
  return [...mockUsers];
}

/**
 * User Service object
 */
export const userService = {
  getUsers,
};

