import { ReactNode, useEffect, useMemo, useState } from 'react';
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
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
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

  async function fetchUsers() {
    const { data, error } = await supabase
      .from('biodata_anggota')
      .select('id_anggota, nama_lengkap, email, created_at, no_ktp, tempat_lahir, tanggal_lahir, jenis_kelamin, alamat, no_telepon, di_kunci, pekerjaan, ktp_pasangan, foto_anggota')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
    } else {
      setUsers(data);
    }
  }
  useEffect(() => {

    fetchUsers();
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setNewUser({ ...newUser, [e.target.name]: e.target.value });
  }

  function handleEditChange(e: React.ChangeEvent<HTMLInputElement>) {
    setEditUser({ ...editUser, [e.target.name]: e.target.value });
  }

  function handleViewClick(user: User) {
    setSelectedUser(user);
    setOpenViewDialog(true);
    setOpenEditDialog(false);
  }


  async function handleLocked(user: User) {
    try {
      const newLockStatus = !user.di_kunci;

      const { error } = await supabase
        .from('biodata_anggota')
        .update({ di_kunci: newLockStatus })
        .eq('id_anggota', user.id_anggota);

      if (error) {
        throw error;
      }

      setUsers(users.map(u =>
        u.id_anggota === user.id_anggota
          ? { ...u, di_kunci: newLockStatus }
          : u
      ));

      if (selectedUser?.id_anggota === user.id_anggota) {
        setSelectedUser({ ...selectedUser, di_kunci: newLockStatus });
      }

      alert(`Biodata ${newLockStatus ? 'berhasil dikunci' : 'berhasil dibuka'}`);
    } catch (error) {
      console.error('Error updating lock status:', error);
      alert('Gagal mengubah status kunci');
    }
  }

  async function handleDelete(user: User) {
    if (!confirm(`Yakin ingin menghapus anggota ${user.nama_lengkap}?`)) return;

    try {
      const { error } = await supabase
        .from('biodata_anggota')
        .delete()
        .eq('id_anggota', user.id_anggota);

      if (error) {
        console.error('Gagal menghapus user:', error);
        alert('Gagal menghapus user: ' + error.message);
        return;
      }

      setUsers(users.filter((u) => u.id_anggota !== user.id_anggota));
      alert('User berhasil dihapus!');
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan saat menghapus user');
    }
  }

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

  async function handleSubmit() {
    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
      });

      if (authError || !authData.user) {
        console.error('Auth error:', authError);
        alert('Gagal membuat akun: ' + authError?.message);
        return;
      }

      const { error: bioError } = await supabase.from('biodata_anggota').insert([
        {
          id: authData.user.id,
          id_anggota: newUser.id_anggota,
          nama_lengkap: newUser.nama_lengkap,
          email: newUser.email,
          created_at: new Date().toISOString(),
        },
      ]);

      if (bioError) {
        console.error('Bio insert error:', bioError);
        alert('Gagal menyimpan biodata: ' + bioError.message);
        return;
      }

      const { error: saldoError } = await supabase.from('saldo_anggota').insert([
        {
          id_anggota: newUser.id_anggota,
          simpanan_pokok: 0,
          simpanan_wajib: 0,
          total_simpanan: 0,
          updated_at: new Date().toISOString(),
        },
      ]);

      if (saldoError) {
        console.error('Saldo insert error:', saldoError);
        alert('Gagal menyimpan saldo anggota: ' + saldoError.message);
        return;
      }

      alert('User berhasil ditambahkan!');
      setOpenAddDialog(false);

      const { data } = await supabase
        .from('biodata_anggota')
        .select('id_anggota, nama_lengkap, email, created_at, no_ktp, tempat_lahir, tanggal_lahir, jenis_kelamin, alamat, no_telepon, di_kunci, pekerjaan, ktp_pasangan, foto_anggota')
        .order('created_at', { ascending: false });
      setUsers(
        (data || []).map((user) => ({
          ...user,
          no_ktp: user.no_ktp || null,
          tempat_lahir: user.tempat_lahir || null,
          tanggal_lahir: user.tanggal_lahir || null,
          jenis_kelamin: user.jenis_kelamin || null,
          alamat: user.alamat || null,
          no_telepon: user.no_telepon || null,
          di_kunci: user.di_kunci || false,
          pekerjaan: user.pekerjaan || null,
          ktp_pasangan: user.ktp_pasangan || null,
          foto_anggota: user.foto_anggota || null,
        }))
      );
    } catch (error) {
      console.error(error);
      alert('Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  }

  async function handleEditSubmit() {
    if (!selectedUser) return;

    try {
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
      const { data } = await supabase
        .from('biodata_anggota')
        .select('id_anggota, nama_lengkap, email, created_at, no_ktp, tempat_lahir, tanggal_lahir, jenis_kelamin, alamat, no_telepon, di_kunci, pekerjaan, ktp_pasangan, foto_anggota')

        .order('created_at', { ascending: false });
      setUsers(
        (data || []).map((user) => ({
          ...user,
          no_ktp: user.no_ktp || null,
          tempat_lahir: user.tempat_lahir || null,
          tanggal_lahir: user.tanggal_lahir || null,
          jenis_kelamin: user.jenis_kelamin || null,
          alamat: user.alamat || null,
          no_telepon: user.no_telepon || null,
          di_kunci: user.di_kunci || false,
          pekerjaan: user.pekerjaan || null,
          ktp_pasangan: user.ktp_pasangan || null,
          foto_anggota: user.foto_anggota || null,
        }))
      );
    } catch (error) {
      console.error(error);
      alert('Terjadi kesalahan');
    }
  }


  const filteredUsers = useMemo(() => {
    const keyword = searchTerm.toLowerCase();

    return users.filter((item) => {
      const idAnggota = String(item.id_anggota || '').toLowerCase();
      const nama = String(item.nama_lengkap || '').toLowerCase();
      const ktp = String(item.no_ktp || '').toLowerCase();
      const tempatLahir = String(item.tempat_lahir || '').toLowerCase();
      const tanggalLahir = String(item.tanggal_lahir || '').toLowerCase();
      const kelamin = String(item.jenis_kelamin || '').toLowerCase();
      const alamat = String(item.alamat || '').toLowerCase();
      const telepon = String(item.no_telepon || '').toLowerCase();
      const pekerjaan = String(item.pekerjaan || '').toLowerCase();

      return (
        idAnggota.includes(keyword) ||
        nama.includes(keyword) ||
        ktp.includes(keyword) ||
        tempatLahir.includes(keyword) ||
        tanggalLahir.includes(keyword) ||
        kelamin.includes(keyword) ||
        alamat.includes(keyword) ||
        telepon.includes(keyword) ||
        pekerjaan.includes(keyword)
      );
    });
  }, [users, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">User</h2>
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
              <Button onClick={handleSubmit} disabled={loading} className="w-full bg-primary ">
                Tambah anggota 
                {loading && <span>Loading...</span>}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            fetchUsers();
            setSearchTerm('');
          }}
        >
          Refresh Tabel
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID Anggota</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Tanggal Gabung</TableHead>
              <TableHead>Status Bio</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center">Anggota tidak ditemukan...</TableCell>
              </TableRow>
            ) :
              (filteredUsers.map((user) => (
                <TableRow key={user.id_anggota}>
                  <TableCell>{user.id_anggota}</TableCell>
                  <TableCell>{user.nama_lengkap || '-'}</TableCell>
                  <TableCell>{user.email || '-'}</TableCell>
                  <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {user.di_kunci ? (
                      <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded">
                        Di kunci
                      </span>
                    ) : (
                      <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">
                        Dapat di ubah
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="outline"
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
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewClick(user)}
                    >
                      Detail
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(user)}
                    >
                      Delete
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleEditClick(user)}
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              )))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={openViewDialog} onOpenChange={setOpenViewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <img src={typeof selectedUser.foto_anggota === 'string' ? selectedUser.foto_anggota : "belum di isi"} alt="" className='h-30 w-30 p-5' />
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
    </div >
  );
}