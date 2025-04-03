import { ReactNode, useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
);

export default function Users() {
  interface User {
    no_ktp: ReactNode;
    tempat_lahir: ReactNode;
    tanggal_lahir: ReactNode;
    jenis_kelamin: ReactNode;
    alamat: ReactNode;
    no_telepon: ReactNode;
    di_kunci?: boolean;
    pekerjaan: ReactNode;
    ktp_pasangan: ReactNode;
    foto_anggota: ReactNode;
    id_anggota: string;
    nama_lengkap: string;
    email: string;
    created_at: string;
    auth_users?: {
      email: string;
    };
  }

  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    nama_lengkap: '',
    id_anggota: '',
  });
  const [editUser, setEditUser] = useState({
    email: '',
    nama_lengkap: '',
    id_anggota: '',
  });

  // Fetch data user dari Supabase
  useEffect(() => {
    async function fetchUsers() {
      const { data, error } = await supabase
        .from('biodata_anggota')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching users:', error);
      } else {
        setUsers(data);
      }
    }

    fetchUsers();
  }, []);

  // Handle form input
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setNewUser({ ...newUser, [e.target.name]: e.target.value });
  }

  // Handle edit form input
  function handleEditChange(e: React.ChangeEvent<HTMLInputElement>) {
    setEditUser({ ...editUser, [e.target.name]: e.target.value });
  }

  // Handle view button click
  function handleViewClick(user: User) {
    setSelectedUser(user);
    setOpenViewDialog(true);
    setOpenEditDialog(false);
  }

  async function handleLocked(user: User) {
    try {
      // Toggle the lock status
      const newLockStatus = !user.di_kunci;

      // Update in Supabase
      const { error } = await supabase
        .from('biodata_anggota')
        .update({ di_kunci: newLockStatus })
        .eq('id_anggota', user.id_anggota);

      if (error) {
        throw error;
      }

      // Update local state
      setUsers(users.map(u =>
        u.id_anggota === user.id_anggota
          ? { ...u, di_kunci: newLockStatus }
          : u
      ));

      // If the locked user is currently being viewed, update that state too
      if (selectedUser?.id_anggota === user.id_anggota) {
        setSelectedUser({ ...selectedUser, di_kunci: newLockStatus });
      }

      // Show success message
      alert(`Biodata ${newLockStatus ? 'berhasil dikunci' : 'berhasil dibuka'}`);
    } catch (error) {
      console.error('Error updating lock status:', error);
      alert('Gagal mengubah status kunci');
    }
  }

  // Handle edit button click
  function handleEditClick(user: User) {
    setSelectedUser(user);
    setEditUser({
      email: user.email,
      nama_lengkap: user.nama_lengkap,
      id_anggota: user.id_anggota,
    });
    setOpenEditDialog(true);
    setOpenViewDialog(false);
  }

  // Handle submit untuk menambahkan user baru
  async function handleSubmit() {
    try {
      // 1. Buat user di Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
      });

      if (authError) {
        alert('Gagal membuat akun: ' + authError.message);
        return;
      }

      // 2. Simpan data ke `biodata_anggota`
      const { error: bioError } = await supabase.from('biodata_anggota').insert([
        {
          id: authData.user?.id,  // Auth ID
          id_anggota: newUser.id_anggota, // Custom ID
          nama_lengkap: newUser.nama_lengkap,
          email: newUser.email,  // Store email in biodata_anggota
          created_at: new Date().toISOString(),
        },
      ]);

      if (bioError) {
        alert('Gagal menyimpan biodata: ' + bioError.message);
        return;
      }

      alert('User berhasil ditambahkan!');
      setOpenAddDialog(false);
      // Refresh user list
      const { data } = await supabase
        .from('biodata_anggota')
        .select('id_anggota, nama_lengkap, email, created_at')
        .order('created_at', { ascending: false });
      setUsers(data || []);
    } catch (error) {
      console.error(error);
      alert('Terjadi kesalahan');
    }
  }

  // Handle submit untuk mengedit user
  async function handleEditSubmit() {
    if (!selectedUser) return;

    try {
      // Update data di `biodata_anggota`
      const { error } = await supabase
        .from('biodata_anggota')
        .update({
          id_anggota: editUser.id_anggota,
          nama_lengkap: editUser.nama_lengkap,
          email: editUser.email,
        })
        .eq('id_anggota', selectedUser.id_anggota);

      if (error) {
        alert('Gagal mengupdate biodata: ' + error.message);
        return;
      }

      alert('User berhasil diupdate!');
      setOpenEditDialog(false);
      // Refresh user list
      const { data } = await supabase
        .from('biodata_anggota')
        .select('id_anggota, nama_lengkap, email, created_at')
        .order('created_at', { ascending: false });
      setUsers(data || []);
    } catch (error) {
      console.error(error);
      alert('Terjadi kesalahan');
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Users</h2>
        <Dialog open={openAddDialog} onOpenChange={setOpenAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                name="email"
                placeholder="Email"
                value={newUser.email}
                onChange={handleChange}
              />
              <Input
                name="password"
                type="password"
                placeholder="Password"
                value={newUser.password}
                onChange={handleChange}
              />
              <Input
                name="id_anggota"
                placeholder="Member ID"
                value={newUser.id_anggota}
                onChange={handleChange}
              />
              <Input
                name="nama_lengkap"
                placeholder="Full Name"
                value={newUser.nama_lengkap}
                onChange={handleChange}
              />
              <Button onClick={handleSubmit} className="w-full">
                Save User
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search Bar */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Table User */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Join Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id_anggota}>
                <TableCell>{user.id_anggota}</TableCell>
                <TableCell>{user.nama_lengkap || '-'}</TableCell>
                <TableCell>{user.email || '-'}</TableCell>
                <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  {user.di_kunci ? (
                    <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded">
                      Locked
                    </span>
                  ) : (
                    <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">
                      Active
                    </span>
                  )}

                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleLocked(user)}
                  >
                    {user.di_kunci ? (
                      <>
                        Buka
                      </>
                    ) : (
                      <>
                        Kunci
                      </>
                    )}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleViewClick(user)}
                  >
                    Detail
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleEditClick(user)}
                  >
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* View User Dialog */}
      <Dialog open={openViewDialog} onOpenChange={setOpenViewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Member ID</h3>
                <p>{selectedUser.id_anggota}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Full Name</h3>
                <p>{selectedUser.nama_lengkap}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">No Ktp</h3>
                <p>{selectedUser.no_ktp || "belum di isi"}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Tempat Lahir</h3>
                <p>{selectedUser.tempat_lahir || "belum di isi"}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Tanggal Lahir</h3>
                <p>{selectedUser.tanggal_lahir || "belum di isi"}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Jenis Kelamin</h3>
                <p>{selectedUser.jenis_kelamin || "belum di isi"}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Alamat</h3>
                <p>{selectedUser.alamat || "belum di isi"}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Telepon</h3>
                <p>{selectedUser.no_telepon || "belum di isi"}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Pekerjaan</h3>
                <p>{selectedUser.pekerjaan || "belum di isi"}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">No Ktp Pasangan</h3>
                <p>{selectedUser.ktp_pasangan || "belum di isi"}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Foto Anggota</h3>
                <p>{selectedUser.foto_anggota || "belum di isi"}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Email</h3>
                <p>{selectedUser.email}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Join Date</h3>
                <p>{new Date(selectedUser.created_at).toLocaleString()}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <Input
                name="email"
                placeholder="Email"
                value={editUser.email}
                onChange={handleEditChange}
              />
              <Input
                name="id_anggota"
                placeholder="Member ID"
                value={editUser.id_anggota}
                onChange={handleEditChange}
              />
              <Input
                name="nama_lengkap"
                placeholder="Full Name"
                value={editUser.nama_lengkap}
                onChange={handleEditChange}
              />
              <Button onClick={handleEditSubmit} className="w-full">
                Update User
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}