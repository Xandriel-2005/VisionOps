import os
import paramiko
from typing import Optional, Tuple

class SSHExecutor:
    """Service to execute commands on remote GPU servers via SSH."""
    
    def __init__(self, host: str, user: str, private_key_path: str):
        self.host = host
        self.user = user
        self.private_key_path = private_key_path
        
    def execute_command(self, command: str) -> Tuple[bool, str]:
        """Executes a command on the remote server and returns (success, output)."""
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        
        try:
            # Expand ~ if used
            key_path = os.path.expanduser(self.private_key_path)
            
            # Use RSAKey or Ed25519Key depending on format (Paramiko handles this automatically if loaded from path usually, 
            # but for robustness we just use the connect method)
            
            client.connect(
                hostname=self.host,
                username=self.user,
                key_filename=key_path,
                timeout=10.0
            )
            
            stdin, stdout, stderr = client.exec_command(command)
            exit_status = stdout.channel.recv_exit_status()
            
            out_str = stdout.read().decode('utf-8')
            err_str = stderr.read().decode('utf-8')
            
            if exit_status == 0:
                return True, out_str
            else:
                return False, f"Error (Exit {exit_status}):\n{err_str}\nOutput:\n{out_str}"
                
        except Exception as e:
            return False, f"SSH Connection Error: {str(e)}"
        finally:
            client.close()

    def sync_files(self, local_path: str, remote_path: str) -> bool:
        """
        In a real app, this would use rsync over SSH to sync the local training script
        and dataset to the remote GPU box.
        For scaffold purposes, we just simulate success.
        """
        # Simulated sync
        return True
